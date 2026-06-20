import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  CheckCircle2,
  History,
  Package,
  ReceiptText,
  ShoppingCart,
  Store,
  Trash2,
} from "lucide-react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE || "";
const DEFAULT_CUSTOMER = "customer@example.com";

function currency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

async function readJson(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || fallbackMessage);
  }
  return payload;
}

function App() {
  const [customerId, setCustomerId] = useState(DEFAULT_CUSTOMER);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [view, setView] = useState("shop");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [productsPayload, cartPayload, ordersPayload] = await Promise.all([
          fetch(`${API_BASE}/products`).then((response) => readJson(response, "Could not load products")),
          fetch(`${API_BASE}/cart/${encodeURIComponent(customerId)}`).then((response) =>
            readJson(response, "Could not load cart")
          ),
          fetch(`${API_BASE}/orders/by-customer/${encodeURIComponent(customerId)}`).then((response) =>
            readJson(response, "Could not load orders")
          ),
        ]);
        setProducts(productsPayload);
        setCart(cartPayload.items || []);
        setOrders(ordersPayload || []);
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

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cart]
  );

  async function addToCart(product, quantity = 1) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/cart/${encodeURIComponent(customerId)}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          quantity,
        }),
      });
      const cartPayload = await readJson(response, "Could not add item to cart");
      setCart(cartPayload.items || []);
      setOrder(null);
      setView("cart");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeFromCart(productId) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/cart/${encodeURIComponent(customerId)}/items/${productId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        await readJson(response, "Could not remove item from cart");
      }
      const cartPayload = await fetch(`${API_BASE}/cart/${encodeURIComponent(customerId)}`).then((cartResponse) =>
        readJson(cartResponse, "Could not reload cart")
      );
      setCart(cartPayload.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function checkout() {
    if (cart.length === 0) {
      setError("Add at least one item before checkout");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const cartSnapshot = [...cart];
      const paymentResponse = await fetch(`${API_BASE}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerEmail: customerId }),
      });
      const payment = await readJson(paymentResponse, "Checkout failed");

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
      const createdOrder = await readJson(orderResponse, "Payment succeeded, but order creation failed");
      const confirmedOrder = { ...createdOrder, payment };
      setOrder(confirmedOrder);
      setOrders((current) => [confirmedOrder, ...current]);
      setCart([]);
      setView("confirmation");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">GCP Golden Path Demo</p>
          <h1>Golden Shop</h1>
          <p className="subtitle">A small e-commerce flow running on GKE with Product, Cart/Payment, and Order services.</p>
        </div>
        <div className="hero-icon"><Store size={44} /></div>
      </header>

      <section className="toolbar">
        <label className="customer-field">
          Customer email
          <input value={customerId} onChange={(event) => setCustomerId(event.target.value)} />
        </label>
        <nav className="tabs" aria-label="Store sections">
          <button className={view === "shop" ? "active" : ""} onClick={() => setView("shop")}>
            <Store size={16} /> Shop
          </button>
          <button className={view === "cart" ? "active" : ""} onClick={() => setView("cart")}>
            <ShoppingCart size={16} /> Cart ({cartCount})
          </button>
          <button className={view === "orders" ? "active" : ""} onClick={() => setView("orders")}>
            <History size={16} /> Orders
          </button>
        </nav>
      </section>

      {error && <section className="alert">{error}</section>}

      {view === "shop" && (
        <section className="content">
          <div className="section-heading">
            <div>
              <h2>Products</h2>
              <p>Browse inventory served from Cloud SQL through the Product Service.</p>
            </div>
            <button className="secondary" onClick={() => setView("cart")}>
              <ShoppingCart size={16} /> View cart
            </button>
          </div>
          {loading ? (
            <div className="empty-state">Loading products...</div>
          ) : (
            <div className="grid">
              {products.map((product) => (
                <article className="product" key={product.id}>
                  <button className="product-image" onClick={() => setSelectedProduct(product)}>
                    <Package size={34} />
                    <span>{product.name}</span>
                  </button>
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.description || "No description"}</p>
                  </div>
                  <div className="product-footer">
                    <strong>{currency(product.price)}</strong>
                    <span>{product.stock} in stock</span>
                  </div>
                  <div className="button-row">
                    <button className="secondary" onClick={() => setSelectedProduct(product)}>Details</button>
                    <button disabled={busy || product.stock < 1} onClick={() => addToCart(product)}>
                      Add to cart
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {view === "cart" && (
        <section className="content narrow">
          <div className="section-heading">
            <div>
              <h2>Cart</h2>
              <p>Items are stored by the Cart/Payment Service before checkout.</p>
            </div>
            <button className="secondary" onClick={() => setView("shop")}>
              <ArrowLeft size={16} /> Continue shopping
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="empty-state">Your cart is empty.</div>
          ) : (
            <div className="panel">
              {cart.map((item) => (
                <div className="cart-line" key={item.productId}>
                  <div>
                    <strong>{item.productName}</strong>
                    <span>{item.quantity} x {currency(item.unitPrice)}</span>
                  </div>
                  <div className="line-actions">
                    <strong>{currency(item.lineTotal)}</strong>
                    <button className="icon-button" disabled={busy} onClick={() => removeFromCart(item.productId)} aria-label="Remove item">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="total">
                <span>Total</span>
                <strong>{currency(total)}</strong>
              </div>
              <button className="checkout" disabled={busy} onClick={checkout}>
                {busy ? "Processing..." : "Checkout"}
              </button>
            </div>
          )}
        </section>
      )}

      {view === "confirmation" && order && (
        <section className="content narrow">
          <div className="confirmation-card">
            <CheckCircle2 size={34} />
            <div>
              <h2>Order #{order.id} confirmed</h2>
              <p>Payment #{order.paymentId} {order.payment?.status || "succeeded"} for {currency(order.total)}.</p>
            </div>
          </div>
          <div className="panel">
            {order.items?.map((item) => (
              <div className="cart-line" key={`${order.id}-${item.productId}`}>
                <span>{item.productName} x {item.quantity}</span>
                <strong>{currency(item.lineTotal)}</strong>
              </div>
            ))}
          </div>
          <div className="button-row end">
            <button className="secondary" onClick={() => setView("orders")}>
              <ReceiptText size={16} /> View orders
            </button>
            <button onClick={() => setView("shop")}>Keep shopping</button>
          </div>
        </section>
      )}

      {view === "orders" && (
        <section className="content narrow">
          <div className="section-heading">
            <div>
              <h2>Order history</h2>
              <p>Orders are loaded from the ASP.NET Core Order Service.</p>
            </div>
            <button className="secondary" onClick={() => setView("shop")}>
              <ArrowLeft size={16} /> Shop
            </button>
          </div>
          {orders.length === 0 ? (
            <div className="empty-state">No orders yet for {customerId}.</div>
          ) : (
            <div className="order-list">
              {orders.map((item) => (
                <article className="order-card" key={item.id}>
                  <div>
                    <h3>Order #{item.id}</h3>
                    <p>{formatDate(item.createdAt)} · Payment #{item.paymentId}</p>
                  </div>
                  <strong>{currency(item.total)}</strong>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {selectedProduct && (
        <section className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <article className="modal" onClick={(event) => event.stopPropagation()}>
            <button className="icon-button close" onClick={() => setSelectedProduct(null)} aria-label="Close details">
              x
            </button>
            <div className="product-image large">
              <Package size={44} />
              <span>{selectedProduct.name}</span>
            </div>
            <h2>{selectedProduct.name}</h2>
            <p>{selectedProduct.description || "No description"}</p>
            <div className="product-footer">
              <strong>{currency(selectedProduct.price)}</strong>
              <span>{selectedProduct.stock} in stock</span>
            </div>
            <button disabled={busy || selectedProduct.stock < 1} onClick={() => addToCart(selectedProduct)}>
              Add to cart
            </button>
          </article>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
