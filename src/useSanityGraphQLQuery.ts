import {ASTNode} from 'graphql'
import {
  useQuery,
  fetchBuilder,
  graphqlRequestBody,
  HydrogenUseQueryOptions
} from '@shopify/hydrogen'

import {SanityQueryClientOptions, UseSanityQueryResponse} from './types'
import useSanityConfig from './useSanityConfig'
import useSanityShopifyProducts from './useSanityShopifyProducts'

interface UseSanityGraphQLQueryProps extends SanityQueryClientOptions {
  /** A string of the GraphQL query. */
  query: ASTNode | string

  /** An object of the variables for the GraphQL query. */
  variables?: {[key: string]: any}

  /** Hydrogen query options */
  queryOptions?: HydrogenUseQueryOptions
}

/**
 * Hook to make server-only GROQ queries to a Sanity dataset.
 */
function useSanityGraphQLQuery<T>({
  query,
  variables = {},
  ...props
}: UseSanityGraphQLQueryProps): UseSanityQueryResponse<T> {
  const {projectId, apiVersion, dataset, token} = useSanityConfig(props.clientConfig)

  const body = graphqlRequestBody(query, variables)
  const url = `https://${projectId}.api.sanity.io/${apiVersion}/graphql/${dataset}/default`

  const headers: {[key: string]: any} = {
    'content-type': 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const fetchOptions = {
    method: 'POST',
    headers,
    body
  }

  const {data: sanityData, error} = useQuery<{data: T}>(
    [projectId, body],
    fetchBuilder<{data: T}>(url, fetchOptions)
  )

  const shopifyProducts = useSanityShopifyProducts(sanityData?.data, props, props.queryOptions)

  return {
    sanityData: sanityData?.data,
    errors: error,
    shopifyProducts
  }
}

export default useSanityGraphQLQuery
