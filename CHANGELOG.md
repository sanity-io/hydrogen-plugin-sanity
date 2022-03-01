# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

<!-- ## Unreleased -->

## 0.3.0 - 2022-03-02

### Deprecated

- As of Hydrogen `0.10` [it's no longer possible](https://github.com/Shopify/hydrogen/issues/679) to store Sanity config in `shopify.config.js`. Please ensure you specify your Sanity configuration in a corresponding `clientConfig` object when calling `useSanityQuery` or `useSanityGraphQLQuery`.

## 0.2.0 - 2021-12-10

- Add support for `shopifyVariables.country` in configuration for querying multi-locale stores.

## 0.1.0 - 2021-11-12

- Initial release with `useSanityQuery` and `useSanityGraphQLQuery`
