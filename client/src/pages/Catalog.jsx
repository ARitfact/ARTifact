import { useEffect, useState } from "react";
import { Link } from "react-router-dom";



const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Catalog() {
  const [catalogItems, setCatalogItems] = useState([]);
 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/catalog`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Unable to load the catalog.");
        }

        const result = await response.json();

        setCatalogItems(
          Array.isArray(result.data) ? result.data : []
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadCatalog();

    return () => controller.abort();
  }, []);

  return (
   <main className="theme-page" style={styles.page}>
      <header style={styles.header}>
        <Link to="/dashboard" style={styles.backLink}>
          ← Dashboard
        </Link>

        <span style={styles.brand}>ARTifact</span>

        <Link to="/plans" style={styles.plansLink}>
          Plans
        </Link>
      </header>

      <div style={styles.content}>
        <div style={styles.intro}>
          <span style={styles.eyebrow}>
            EXPLORE YOUR POSSIBILITIES
          </span>

          <h1 style={styles.title}>
            Furniture catalog
          </h1>

          <p style={styles.description}>
            Discover furniture, inspect it in 3D,
            and preview it in your room with AR.
          </p>
        </div>

        {loading ? (
          <div style={styles.empty}>
            Loading furniture...
          </div>
        ) : error ? (
          <div style={styles.empty} role="alert">
            {error}
          </div>
        ) : catalogItems.length === 0 ? (
          <div style={styles.empty}>
            <h2>No furniture added yet</h2>
            <p>New pieces will appear here soon.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {catalogItems.map((item) => (
              <article
                key={item.id}
                style={styles.card}
              >
               <Link
  to={`/preview/catalog/${item.id}`}
  style={styles.cardButton}
  aria-label={`Preview ${item.name} in 3D`}
>
                  <img
                    src={item.thumbnailUrl}
                    alt={item.name}
                    loading="lazy"
                    style={styles.thumbnail}
                  />

                  <div style={styles.cardDetails}>
                    <div>
                      <small style={styles.category}>
                        {item.category}
                      </small>

                      <h2 style={styles.itemName}>
                        {item.name}
                      </h2>
                    </div>

                    <span style={styles.arrow}>
                      ↗
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}

        
      </div>

      
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0b0d0a",
    color: "#f5f5ee",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    minHeight: 76,
    padding: "16px clamp(18px, 5vw, 64px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    borderBottom: "1px solid #30352b",
  },

  backLink: {
    color: "#d7ff3f",
    textDecoration: "none",
    fontSize: 14,
  },

  brand: {
    fontSize: 22,
    fontWeight: 800,
  },

  plansLink: {
    color: "#f5f5ee",
    textDecoration: "none",
    fontSize: 14,
  },

  content: {
    width: "min(1280px, calc(100% - 36px))",
    margin: "0 auto",
    padding: "50px 0 90px",
  },

  intro: {
    marginBottom: 35,
  },

  eyebrow: {
    color: "#d7ff3f",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.16em",
  },

  title: {
    margin: "12px 0",
    fontSize: "clamp(36px, 5vw, 64px)",
    letterSpacing: "-0.06em",
  },

  description: {
    maxWidth: 620,
    color: "#a7aea0",
    lineHeight: 1.7,
  },

  empty: {
    padding: 45,
    border: "1px dashed #59644a",
    borderRadius: 18,
    background: "#171a14",
    color: "#a7aea0",
  },

  grid: {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fill, minmax(160px, 190px))",
  gap: 16,
},

  card: {
    overflow: "hidden",
    border: "1px solid #30352b",
    borderRadius: 18,
    background: "#171a14",
  },

  cardButton: {
    display: "block",
    width: "100%",
    padding: 0,
    border: 0,
    background: "transparent",
    color: "inherit",
    textAlign: "left",
    cursor: "pointer",
  },

 thumbnail: {
  display: "block",
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "cover",
  background: "#272c22",
},
  cardDetails: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 18,
  },

  category: {
    color: "#a7aea0",
  },

  itemName: {
    margin: "6px 0 0",
    fontSize: 19,
  },

  arrow: {
    color: "#d7ff3f",
    fontSize: 24,
  },

  preview: {
    marginTop: 48,
    overflow: "hidden",
    border: "1px solid #394131",
    borderRadius: 20,
    background: "#171a14",
  },

  previewHeader: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: 20,
  },

  previewTitle: {
    margin: "6px 0 0",
  },

  previewActions: {
    display: "flex",
    gap: 10,
  },

  arButton: {
    padding: "11px 17px",
    border: 0,
    borderRadius: 9,
    background: "#d7ff3f",
    color: "#171b0b",
    fontWeight: 800,
    cursor: "pointer",
  },

  closeButton: {
    padding: "10px 14px",
    border: "1px solid #555c4b",
    borderRadius: 9,
    background: "#262b21",
    color: "white",
    cursor: "pointer",
  },

  viewer: {
    height: "min(70vh, 650px)",
    minHeight: 550,
  },
};