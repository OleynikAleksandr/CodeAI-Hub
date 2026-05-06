# Application Skeleton Contract Reference

## Canonical Files
- `application-skeleton.md`: human-readable technical scaffold decision record.
- `application-skeleton-map.json`: machine-readable mapping from Development Tree ownership to production code paths.

## JSON Shape
```json
{
  "schema": "codeai-application-skeleton-v1",
  "accepted": false,
  "sourceRoot": "src",
  "productParts": [
    {
      "id": "product-part-id",
      "codePath": "src/product-parts/product-part-id",
      "clusters": [
        {
          "id": "cluster-id",
          "codePath": "src/product-parts/product-part-id/clusters/cluster-id",
          "modules": [
            {
              "id": "module-id",
              "codePath": "src/product-parts/product-part-id/clusters/cluster-id/modules/module-id"
            }
          ]
        }
      ],
      "standaloneModules": [
        {
          "id": "module-id",
          "codePath": "src/product-parts/product-part-id/modules/module-id"
        }
      ]
    }
  ],
  "notes": []
}
```

## Validation Rules
- `productParts` must be an array.
- Every generated Product Part must have a mapping or an explicit deferred disposition.
- Every mapped path must be relative, normalized, and inside the workspace.
- `accepted` must stay `false` until the user explicitly accepts the skeleton.
- Quality gate commands may be proposed in Markdown, but the dedicated Quality Gates stage owns the accepted command contract.
