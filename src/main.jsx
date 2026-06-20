import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ShoppingCart, Store, CheckCircle2 } from "lucide-react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE || "";

function currency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

function App() {
  const [customerId, setCustomerId] = useState("customer@example.com");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [productsResponse, cartResponse] = await Promise.all([
          fetch(`${API_BASE}/products`),
          fetch(`${API_BASE}/cart/${encodeURIComponent(customerId)}`),
        ]);
        if (!productsResponse.ok) throw new Error("Could not load products");
        if (!cartResponse.ok) throw new Error("Could not load cart");
        setProducts(await productsResponse.json());
        const cartPayload = await cartResponse.json();
        setCart(cartPayload.items || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [customerId]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0),
    [cart]
  );

  async function addToCart(product) {
    setError("");
    const response = await fetch(`${API_BASE}/cart/${encodeURIComponent(customerId)}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: 1,
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.detail || "Could not add item to cart");
      return;
    }
    const cartPayload = await response.json();
    setCart(cartPayload.items || []);
    setOrder(null);
  }

  async function checkout() {
    setError("");
    const cartSnapshot = [...cart];
    const paymentResponse = await fetch(`${API_BASE}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerEmail: customerId }),
    });

    if (!paymentResponse.ok) {
      const payload = await paymentResponse.json().catch(() => ({}));
      setError(payload.detail || "Checkout failed");
      return;
    }

    const payment = await paymentResponse.json();
    const orderResponse = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerEmail: customerId,
        paymentId: payment.paymentId,
        items: cartSnapshot.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      }),
    });

    if (!orderResponse.ok) {
      const payload = await orderResponse.json().catch(() => ({}));
      setError(payload.detail || "Payment succeeded, but order creation failed");
      return;
    }

    const createdOrder = await orderResponse.json();
    setOrder({ ...createdOrder, payment });
    setCart([]);
  }

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">GCP Golden Path Demo</p>
          <h1>Golden Shop</h1>
          <p className="subtitle">A tiny e-commerce storefront running on GKE with Cloud SQL-backed products.</p>
        </div>
        <div className="hero-icon"><Store size={44} /></div>
      </header>

      {error && <section className="alert">{error}</section>}

      <section className="layout">
        <div>
          <h2>Products</h2>
          {loading ? (
            <p>Loading products...</p>
          ) : (
            <div className="grid">
              {products.map((product) => (
                <article className="product" key={product.id}>
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.description || "No description"}</p>
                  </div>
                  <div className="product-footer">
                    <strong>{currency(product.price)}</strong>
                    <span>{product.stock} in stock</span>
                  </div>
                  <button disabled={product.stock < 1} onClick={() => addToCart(product)}>
                    Add to cart
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="cart">
          <div className="cart-title">
            <ShoppingCart size={20} />
            <h2>Cart</h2>
          </div>
          {cart.length === 0 ? (
            <p className="muted">Your cart is empty.</p>
          ) : (
            <>
              {cart.map((item) => (
                <div className="cart-line" key={item.productId}>
                  <span>{item.productName} x {item.quantity}</span>
                  <strong>{currency(item.lineTotal)}</strong>
                </div>
              ))}
              <div className="total">
                <span>Total</span>
                <strong>{currency(total)}</strong>
              </div>
              <label>
                Email
                <input value={customerId} onChange={(event) => setCustomerId(event.target.value)} />
              </label>
              <button className="checkout" onClick={checkout}>Checkout</button>
            </>
          )}
          {order && (
            <div className="confirmation">
              <CheckCircle2 size={20} />
              <span>Order #{order.id} confirmed. Payment #{order.paymentId} {order.payment?.status} for {currency(order.total)}</span>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
