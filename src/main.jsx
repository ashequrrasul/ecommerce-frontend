import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ShoppingCart, Store, CheckCircle2 } from "lucide-react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE || "";

function currency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [order, setOrder] = useState(null);
  const [email, setEmail] = useState("customer@example.com");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/products`)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load products");
        return response.json();
      })
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [cart]
  );

  function addToCart(product) {
    setCart((items) => {
      const existing = items.find((item) => item.id === product.id);
      if (existing) {
        return items.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...items, { ...product, quantity: 1 }];
    });
    setOrder(null);
  }

  async function checkout() {
    setError("");
    const response = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_email: email,
        items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.detail || "Checkout failed");
      return;
    }

    const createdOrder = await response.json();
    setOrder(createdOrder);
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
                <div className="cart-line" key={item.id}>
                  <span>{item.name} x {item.quantity}</span>
                  <strong>{currency(Number(item.price) * item.quantity)}</strong>
                </div>
              ))}
              <div className="total">
                <span>Total</span>
                <strong>{currency(total)}</strong>
              </div>
              <label>
                Email
                <input value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <button className="checkout" onClick={checkout}>Checkout</button>
            </>
          )}
          {order && (
            <div className="confirmation">
              <CheckCircle2 size={20} />
              <span>Order #{order.id} confirmed for {currency(order.total)}</span>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
