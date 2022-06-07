import {HydrogenUseQueryOptions, useQuery} from '@shopify/hydrogen'

import {SanityQueryClientOptions, UseSanityQueryResponse} from './types'
import useSanityConfig from './useSanityConfig'
import useSanityShopifyProducts from './useSanityShopifyProducts'

interface UseSanityQueryProps extends SanityQueryClientOptions {
  /** A string of the GROQ query. */
  query: string

  /** An object of the variables for the GROQ query. */
  params?: {[key: string]: unknown}

  /** Hydrogen query options */
  queryOptions?: HydrogenUseQueryOptions
}

/**
 * Hook to make server-only GROQ queries to a Sanity dataset.
 */
function useSanityQuery<T>({
  query,
  params = {},
  ...props
}: UseSanityQueryProps): UseSanityQueryResponse<T> {
  const {apiVersion, projectId, useCdn, dataset, token} = useSanityConfig(props.clientConfig)

  const version = apiVersion || 'v2021-10-24'
  const baseDomain = `${projectId}.${useCdn ? 'apicdn' : 'api'}.sanity.io`
  const url = `https://${baseDomain}/${
    version.startsWith('v') ? version : `v${version}`
  }/data/query/${dataset}`

  const {data: sanityData, error} = useQuery<T>(
    [query, params],
    async () => {
      const data = await (
        await fetch(url, {
          method: 'POST',
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            : {
                'Content-Type': 'application/json'
              },
          body: JSON.stringify({
            query,
            params
          })
        })
      ).json()

      // if (!data.result) {
      //   throw new Error(data.error?.description || "[hydrogen-plugin-sanity] Couldn't fetch data")
      // }

      return data.result
    },
    props.queryOptions || {}
  )

  const shopifyProducts = useSanityShopifyProducts(sanityData, props)

  return {
    sanityData,
    errors: error,
    shopifyProducts
  }
}

export default useSanityQuery
