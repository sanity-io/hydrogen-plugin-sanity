import {ASTNode} from 'graphql'
import {
  isClient,
  useShop,
  useQuery,
  fetchBuilder,
  graphqlRequestBody,
  HydrogenUseQueryOptions
} from '@shopify/hydrogen'
import {UseShopQueryResponse} from '@shopify/hydrogen/dist/esnext/hooks/useShopQuery/hooks'

/**
 * Copy of Hydrogen's default useShopQuery that allows you to pass an `undefined` query for not fetching any data.
 * Is required by by hydrogen-plugin-sanity because we won't always have data to query from Shopify, and can't break the Rules of Hooks by not calling `useShopQuery` when that isn't needed.
 */
export function useSkippableShopQuery<T>({
  query,
  variables = {},
  queryOptions
}: {
  /** A string of the GraphQL query. */
  query: ASTNode | string | undefined

  /** An object of the variables for the GraphQL query. */
  variables?: {[key: string]: any}

  /** Hydrogen query options */
  queryOptions?: HydrogenUseQueryOptions
}): UseShopQueryResponse<T> {
  if (isClient()) {
    throw new Error('Shopify Storefront API requests should only be made from the server.')
  }

  const {storeDomain, storefrontApiVersion, storefrontToken} = useShop()

  const body = query ? graphqlRequestBody(query, variables) : undefined
  const url = `https://${storeDomain}/api/${storefrontApiVersion}/graphql.json`
  const fetchOptions = {
    method: 'POST',
    headers: {
      'X-Shopify-Storefront-Access-Token': storefrontToken,
      'content-type': 'application/json'
    },
    body
  }

  const {data} = useQuery<UseShopQueryResponse<T | undefined>>(
    [storeDomain, storefrontApiVersion, body],
    query
      ? fetchBuilder<UseShopQueryResponse<T>>(url, fetchOptions)
      : // If no query, return nothing
        // eslint-disable-next-line
        async () => ({data: undefined, errors: undefined}),
    queryOptions
  )

  /**
   * GraphQL errors get printed to the console but ultimately
   * get returned to the consumer.
   */
  if (data?.errors) {
    const errors = data.errors instanceof Array ? data.errors : [data.errors]
    for (const error of errors) {
      console.error('GraphQL Error', error)
    }
    console.error(`GraphQL errors: ${errors.length}`)
  }

  return data as UseShopQueryResponse<T>
}
