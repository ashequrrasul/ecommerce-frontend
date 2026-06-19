# Ecommerce Frontend

React + Vite storefront for Phase 1 of the GCP Golden Path e-commerce app.

The frontend calls the product service through the same host:

```text
/products
/orders
```

GitHub Actions builds the image, pushes it to Artifact Registry, and updates the deploy repo image tag.
