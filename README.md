# Sanity plugin for Hydrogen

:warning:️ **Hydrogen is in developer preview and undergoing frequent breaking changes. This plugin is currently compatible with `@shopify/hydrogen <= 0.9`.** :warning:

[Sanity](https://www.sanity.io/) is the platform for structured content that lets you build better digital experiences. Shopify customers can use Sanity Studio, our open-source content editing environment, to combine product and marketing information to build unique shopping experiences.

This plugin for Shopify's Hydrogen lets you query Sanity data, combine it with live inventory, and present that information with Hydrogen components. A `useSanityQuery` React hook with an API similar to `useShopQuery` is exposed to efficiently and ergonomically fetch data from a Sanity instance.

## Getting Started

To add the plugin as a dependency to your project:

```bash
yarn add hydrogen-plugin-sanity # or `npm install`
```

Then add a `sanity` object to `shopify.config.js` with your client configuration (options come from [@sanity/client](https://www.sanity.io/docs/js-client)):

```js
// shopify.config.js

export default {
  storeDomain: '...',
  // ...
  sanity: {
    // Pull your Sanity configuration from environment variables
    projectId: import.meta.VITE_SANITY_ID,
    // Or add them directly inline
    dataset: 'production',
    apiVersion: 'v2021-06-07'
  }
}
```

Now you're ready to fetch data from a Sanity instance. Keep in mind that **queries must be ran in server components**.

### Fetching Sanity data through GraphQL

```js
// Using GraphQL
import {useSanityGraphQLQuery} from 'hydrogen-plugin-sanity'

const {sanityData} = useSanityGraphQLQuery({
  query: gql`
    query homepage($homeId: String!) {
      home: Home(id: $homeId) {
        featuredProducts {
          _id
          images {
            asset {
              _id
            }
          }
        }
      }
    }
  `,
  variables: {homeId: 'homepage'}
})
```

### Fetching data through [GROQ](https://www.sanity.io/docs/overview-groq)

```js
// Using GROQ
import {useSanityQuery} from 'hydrogen-plugin-sanity'

const {sanityData} = useSanityQuery({
  query: `*[_id == $homeId][0]{
      ...,
      featuredProducts[] {
        _id,
        images[] {
          asset {
            _id
          }
        }
      }
    }
    `,
  params: {homeId: 'homepage'}
})
```

### Getting product data from Shopify

By default, the hook will automatically look for Shopify products referenced in your Sanity data and fetch them from Shopify for fresh inventory data. The resulting data will be returned through the `shopifyProducts` object:

```jsx
import {BuyNowButton, ProductProvider} from '@shopify/hydrogen'

const Homepage = () => {
  const {sanityData, shopifyProducts} = useSanityQuery({
    query: `*[_id == "homepage"][0]{
      ...,
      featuredProducts[] {
        _id,
        images[] {
          asset {
            _id
          }
        }
      }
    }
    `
  })

  return (
    <div>
      <h1>{sanityData.title}</h1>
      <div>
        {sanityData.featuredProducts.map((product) => {
          // From the product's ID in Sanity, let's get its Shopify data
          const shopifyProduct = shopifyProducts?.[product?._id]
          const firstVariant = shopifyProduct?.variants?.edges[0]?.node

          return (
            <ProductProvider value={shopifyProduct} initialVariantId={firstVariant?.id}>
              <h2>{shopifyProduct.title}</h2>
              <BuyNowButton>Buy now</BuyNowButton>
            </ProductProvider>
          )
        })}
      </div>
    </div>
  )
}
```

At this point, you now have both your data from Sanity and fresh product data from Storefront API that you can inject right into your Hydrogen [`<ProductProvider>`][hydrogen-product-provider] components to take advantage of their various [Product helper components][hydrogen-product-components].

How you choose to combine these two sources of data in your app is a matter of personal preference and project structure. Refer to our [hydrogen-sanity-demo](https://github.com/sanity-io/hydrogen-sanity-demo) for an example of how to use this data.

### Advanced product querying

You can customize what data you fetch from Shopify on a product basis with the `getProductGraphQLFragment` function. For example, if we're on a legal page where there's no product to buy, we can skip fetching any Shopify data:

```js
const {handle} = useParams()

const {sanityData} = useSanityQuery({
  query: `*[
    _type == "page.legal" &&
    slug.current == $handle
  ][0]`,
  params: {
    handle
  },
  // No need to query Shopify product data
  getProductGraphQLFragment: () => false
})
```

`getProductGraphQLFragment` receives an object with `shopifyId`, `sanityId`, and `occurrences` - where in the data structure this product has been found - and must return either:

- `true` for fetching default product data (which uses [ProductProviderFragment](https://shopify.dev/beta/hydrogen/reference/components/product-variant/productprovider#graphql-fragment))
- `false` for avoiding fetching data for this product
- A string with the GraphQL fragment for that product

With this, you can fetch specific product data for each use-case. For example, if a product shows up in the first section of a homepage, let's only fetch its full data if it's featured. Otherwise, grabbing its title & handle is enough as we won't offer an "Add to Cart" button for it.

In this example, let's assume the data from Sanity is as follows:

```json
{
  "_type": "homepage",
  "firstSection": {
    "title": "Fresh out the oven",
    "products": [
      {
        "_type": "section-item",
        "_key": "7349334187288",
        "featured": false,
        "product": {
          "_id": "shopifyProduct-7349334187288",
          "store": {
            "handle": "regular-product"
          }
        }
      },
      {
        "_type": "hero-item",
        "_key": "7342335787245",
        "featured": true,
        "product": {
          "_id": "shopifyProduct-7342335787245",
          "store": {
            "handle": "special-product"
          }
        }
      }
    ]
  }
}
```

From this data structure, here's how we'd achieve that:

```js
const {sanityData, shopifyProducts} = useSanityQuery({
  query: QUERY,
  getProductGraphQLFragment: ({occurrences}) => {
    // If the product ID shows up in 2+ places, fetch the default product data
    if (occurrences.length > 1) {
      return true
    }

    /* Immediate parent of where this product appears (occurrences[0][0]) -> {
      "_id": "shopifyProduct-7342335787245",
      "shopify": {
        "handle": "special-product"
      }
    }

    Parent of parent (occurrences[0][1]) -> {
      "_type": "section-item",
      featured: true,
      "product": {
        "_id": "shopifyProduct-7342335787245",
        "store": {
          "handle": "special-product"
        }
      }
    }*/
    if (occurrences[0][1]?._type === 'section-item') {
      if (!occurrences[0][1].featured) {
        //  We only want the title & handle for non-featured products
        return `
      title
      handle
      `
      }
    }

    // Get the default ProductProviderFragment otherwise
    return true
  }
})
```

### Using `useSanityQuery` to fetch Sanity data only

`useSanityQuery` won't make any requests to the Storefront API for products if it can't find any valid references. However, you can specifically opt-out of this behavior by providing a custom `getProductGraphQLFragment` function which always returns false.

```javascript
const {sanityData} = useSanityQuery({
  query: `
    *[_type == "page.legal"][0] {
      slug.current == $handle
    }
  `,
  params: {handle},
  // No need to query Shopify product data
  getProductGraphQLFragment: () => false
})
```

## How it works

<img width="700" alt="useSanityQuery flow diagram" src="https://user-images.githubusercontent.com/209129/141044556-6fbcfaf4-226e-4749-aa0e-6428c5f46850.png">

### Assumptions

In order for `useSanityQuery` to be able to identify Shopify products in your dataset and query for them on your behalf, there are two rules you must follow:

**1. Your Shopify product documents in Sanity must have an `_id` with the following naming convention:**

**`shopifyProduct-${ID}`**

Where `ID` is the ID of the product in Shopify. This is exposed in the URL when navigating your Shopify admin
e.g. `https://my-shopify-store.myshopify.com/admin/products/6639629926487`

The correct document `_id` for the above example would be:  
`shopifyProduct-6639629926487`

**2. Your Sanity query response must return these IDs in either `_id` or `_ref` keys**

These can any number of levels nested in your response. Either of the below are valid.

```javascript
"result": {
  "products": {
    [
      {
        "_ref": "shopifyProduct-6639500034135",
      },
      {
        "_ref": "shopifyProduct-6639504195671",
      },
    ]
  }
}
```

```javascript
"result": {
  "body": [
    {
      "_type": "myCustomPortableTextBlock",
      "caption": "Product caption",
      "myNestedObject": {
        "product": {
          "_ref": "shopifyProduct-6639629926487"
        }
      }
    },
  ]
}
```

If you're using Sanity Connect, it will automatically create documents with this naming convention by default.

[hydrogen-product-components]: https://shopify.dev/api/hydrogen/components/product-variant
[hydrogen-product-provider]: https://shopify.dev/api/hydrogen/components/product-variant/productprovider
