import React, { createContext, useState, useEffect, useContext } from 'react';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('shopnow_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [token, setToken] = useState(() => localStorage.getItem('shopnow_token') || null);
  const [cart, setCart] = useState({ items: [], totalPrice: 0 });
  const [notifications, setNotifications] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [systemLogs, setSystemLogs] = useState([]);

  // Log system activity (helpful for showing microservice interactions)
  const addLog = (message, service = 'Client') => {
    const timestamp = new Date().toLocaleTimeString();
    setSystemLogs(prev => [{ timestamp, service, message }, ...prev].slice(0, 100));
  };

  // Sync token to localstorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('shopnow_token', token);
    } else {
      localStorage.removeItem('shopnow_token');
    }
  }, [token]);

  // Sync user details to localstorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('shopnow_user', JSON.stringify(user));
      addLog(`User logged in as ${user.email} (${user.role})`, 'MS-01 User Service');
      fetchCart(user.userId);
      fetchNotifications(user.userId);
    } else {
      localStorage.removeItem('shopnow_user');
      setCart({ items: [], totalPrice: 0 });
      setNotifications([]);
    }
  }, [user]);

  // Initial products fetch
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async (query = '', category = '') => {
    setLoadingProducts(true);
    try {
      addLog(`Fetching products. Query: "${query}", Category: "${category}"`, 'MS-02 Product Catalog');
      let url = '/products';
      if (query) {
        url = `/search?q=${encodeURIComponent(query)}`;
        if (category) url += `&category=${encodeURIComponent(category)}`;
      } else if (category) {
        url = `/products/category/${encodeURIComponent(category)}`;
      }
      
      const headers = {};
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        // The endpoint search returns products directly or in a nested search structure
        const productList = Array.isArray(data) ? data : (data.products || data.results || []);
        if (productList.length === 0) {
          throw new Error('Database product list is empty');
        }
        setProducts(productList);
        addLog(`Loaded ${productList.length} products.`, 'MS-02 Product Catalog');
      } else {
        throw new Error('Catalog service returned non-OK status');
      }
    } catch (err) {
      addLog(`Failed to fetch live products, loading demo fallback: ${err.message}`, 'MS-02 Product Catalog');
      // Demo fallback products
      const fallbackProducts = [
        {
          id: 'prod-001',
          productId: 'prod-001',
          name: 'iPhone 15 Pro Max',
          category: 'mobiles',
          price: 139900,
          stock: 25,
          description: 'Titanium design with A17 Pro chip, 5x Telephoto camera, and USB-C support.',
          rating: 4.9,
          ratingCount: 238,
          isFeatured: true,
          attributes: { brand: 'Apple', color: 'Natural Titanium' },
          image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-002',
          productId: 'prod-002',
          name: 'Samsung Galaxy S24 Ultra',
          category: 'mobiles',
          price: 129999,
          stock: 18,
          description: 'Galaxy AI-powered flagship with Snapdragon 8 Gen 3, 200MP camera, and built-in S Pen.',
          rating: 4.8,
          ratingCount: 194,
          isFeatured: true,
          attributes: { brand: 'Samsung', color: 'Titanium Yellow' },
          image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-003',
          productId: 'prod-003',
          name: 'OnePlus 12 5G',
          category: 'mobiles',
          price: 64999,
          stock: 35,
          description: 'Elite performance phone with 4th Gen Hasselblad Camera, 100W SuperVOOC charging.',
          rating: 4.7,
          ratingCount: 88,
          isFeatured: false,
          attributes: { brand: 'OnePlus', color: 'Flowy Emerald' },
          image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-004',
          productId: 'prod-004',
          name: 'Google Pixel 8 Pro',
          category: 'mobiles',
          price: 93999,
          stock: 12,
          description: 'Fully upgraded Pixel camera with Google Tensor G3, advanced AI features, and 7 years of updates.',
          rating: 4.6,
          ratingCount: 112,
          isFeatured: true,
          attributes: { brand: 'Google', color: 'Bay Blue' },
          image: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-005',
          productId: 'prod-005',
          name: 'MacBook Pro 14" M3 Max',
          category: 'laptops',
          price: 199900,
          stock: 8,
          description: 'Mind-blowing performance laptop with 14-core CPU, 30-core GPU, Liquid Retina XDR display.',
          rating: 4.9,
          ratingCount: 75,
          isFeatured: true,
          attributes: { brand: 'Apple', color: 'Space Black' },
          image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-006',
          productId: 'prod-006',
          name: 'Dell XPS 15 OLED',
          category: 'laptops',
          price: 149999,
          stock: 10,
          description: 'Stunning 15.6" 3.5K OLED touch display, Intel Core i9, NVIDIA RTX 4060, premium CNC aluminum.',
          rating: 4.5,
          ratingCount: 64,
          isFeatured: false,
          attributes: { brand: 'Dell', color: 'Platinum Silver' },
          image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-007',
          productId: 'prod-007',
          name: 'ASUS ROG Zephyrus G14',
          category: 'laptops',
          price: 134990,
          stock: 4,
          description: 'Compact 14" gaming beast with AMD Ryzen 9, RTX 4070, 120Hz Nebula HDR OLED display.',
          rating: 4.7,
          ratingCount: 53,
          isFeatured: true,
          attributes: { brand: 'ASUS', color: 'Eclipse Gray' },
          image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-008',
          productId: 'prod-008',
          name: 'HP Spectre x360 2-in-1',
          category: 'laptops',
          price: 115999,
          stock: 15,
          description: 'Convertible touchscreen laptop with Intel Evo Platform, AI smart features, and long battery life.',
          rating: 4.6,
          ratingCount: 42,
          isFeatured: false,
          attributes: { brand: 'HP', color: 'Nightfall Black' },
          image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-009',
          productId: 'prod-009',
          name: 'Sony WH-1000XM5 ANC',
          category: 'headphones',
          price: 29990,
          stock: 40,
          description: 'Industry-leading wireless noise cancelling headphones with auto optimizer and crystal clear calls.',
          rating: 4.8,
          ratingCount: 312,
          isFeatured: true,
          attributes: { brand: 'Sony', color: 'Silver' },
          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-010',
          productId: 'prod-010',
          name: 'Bose QuietComfort Ultra',
          category: 'headphones',
          price: 35900,
          stock: 25,
          description: 'World-class noise cancellation, breakthrough spatialized audio, and ultra-luxurious comfort.',
          rating: 4.7,
          ratingCount: 185,
          isFeatured: false,
          attributes: { brand: 'Bose', color: 'Black' },
          image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-011',
          productId: 'prod-011',
          name: 'Apple AirPods Max',
          category: 'headphones',
          price: 59900,
          stock: 14,
          description: 'Apple-designed dynamic driver provides high-fidelity audio, Active Noise Cancellation and transparency mode.',
          rating: 4.6,
          ratingCount: 201,
          isFeatured: true,
          attributes: { brand: 'Apple', color: 'Space Gray' },
          image: 'https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-012',
          productId: 'prod-012',
          name: 'Sennheiser Momentum 4 Wireless',
          category: 'headphones',
          price: 24990,
          stock: 30,
          description: 'Audiophile-inspired 42mm sound quality with 60-hour battery life, adaptive ANC, and customizable sound.',
          rating: 4.7,
          ratingCount: 95,
          isFeatured: false,
          attributes: { brand: 'Sennheiser', color: 'White' },
          image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-013',
          productId: 'prod-013',
          name: 'Apple Watch Ultra 2',
          category: 'smartwatches',
          price: 89900,
          stock: 16,
          description: 'The ultimate sports and adventure watch. Brightest Always-On Retina display, dual-frequency GPS.',
          rating: 4.9,
          ratingCount: 147,
          isFeatured: true,
          attributes: { brand: 'Apple', color: 'Titanium' },
          image: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-014',
          productId: 'prod-014',
          name: 'Samsung Galaxy Watch 6 LTE',
          category: 'smartwatches',
          price: 27999,
          stock: 22,
          description: 'Advanced sleep coaching, personalized heart rate zones, and elegant slim watch face design.',
          rating: 4.5,
          ratingCount: 88,
          isFeatured: false,
          attributes: { brand: 'Samsung', color: 'Graphite' },
          image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-015',
          productId: 'prod-015',
          name: 'Garmin Fenix 7 Pro Sapphire',
          category: 'smartwatches',
          price: 74990,
          stock: 6,
          description: 'Solar-powered multisport GPS watch with built-in LED flashlight, preloaded topo maps.',
          rating: 4.8,
          ratingCount: 65,
          isFeatured: true,
          attributes: { brand: 'Garmin', color: 'Carbon Gray' },
          image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-016',
          productId: 'prod-016',
          name: 'Fitbit Sense 2 Smartwatch',
          category: 'smartwatches',
          price: 20999,
          stock: 28,
          description: 'Health and fitness watch with all-day stress management, ECG app, and built-in GPS tracker.',
          rating: 4.3,
          ratingCount: 76,
          isFeatured: false,
          attributes: { brand: 'Fitbit', color: 'Shadow Grey' },
          image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-017',
          productId: 'prod-017',
          name: 'Nike Air Max Alpha Sneakers',
          category: 'shoes',
          price: 7995,
          stock: 45,
          description: 'Max Air cushioning offers stable comfort. Wide, flat base gives enhanced stability and grip.',
          rating: 4.6,
          ratingCount: 154,
          isFeatured: true,
          attributes: { brand: 'Nike', color: 'Crimson Red' },
          image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-018',
          productId: 'prod-018',
          name: 'Adidas Ultraboost Light',
          category: 'shoes',
          price: 18999,
          stock: 30,
          description: 'Continental Rubber outsole, Light BOOST cushioning provides incredible energy return.',
          rating: 4.8,
          ratingCount: 220,
          isFeatured: true,
          attributes: { brand: 'Adidas', color: 'Core Black' },
          image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-019',
          productId: 'prod-019',
          name: 'Puma Velocity Nitro 3',
          category: 'shoes',
          price: 9999,
          stock: 20,
          description: 'NITRO Infused foam midsole, PUMAGRIP high-traction outsole for premium durability and responsiveness.',
          rating: 4.4,
          ratingCount: 68,
          isFeatured: false,
          attributes: { brand: 'Puma', color: 'Fire Orange' },
          image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-020',
          productId: 'prod-020',
          name: 'Levi Sherpa Denim Jacket',
          category: 'clothing',
          price: 5999,
          stock: 50,
          description: 'The original denim jacket since 1967, featuring warm sherpa lining and iconic Levi metal buttons.',
          rating: 4.7,
          ratingCount: 175,
          isFeatured: true,
          attributes: { brand: "Levi's", color: 'Stone Wash Denim' },
          image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-021',
          productId: 'prod-021',
          name: 'Nike Dri-FIT Fleece Hoodie',
          category: 'clothing',
          price: 3495,
          stock: 65,
          description: 'Dri-FIT technology wicks sweat, soft French terry fleece fabric provides cozy warmth.',
          rating: 4.5,
          ratingCount: 130,
          isFeatured: false,
          attributes: { brand: 'Nike', color: 'Olive Green' },
          image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'prod-022',
          productId: 'prod-022',
          name: 'Zara Slim Fit Tweed Blazer',
          category: 'clothing',
          price: 7990,
          stock: 15,
          description: 'Premium textured tweed fabric, notched lapels, chest welt pocket and front flap pocket design.',
          rating: 4.4,
          ratingCount: 45,
          isFeatured: true,
          attributes: { brand: 'Zara', color: 'Navy Blue' },
          image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&auto=format&fit=crop&q=80'
        }
      ];
      setProducts(fallbackProducts);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCart = async (userId) => {
    if (!userId) return;
    try {
      addLog(`Syncing cart for user ${userId}`, 'MS-06 Shopping Cart');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/cart/${userId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
        addLog(`Cart loaded. Items: ${data.items?.length || 0}`, 'MS-06 Shopping Cart');
      } else {
        throw new Error('Non-OK cart response');
      }
    } catch (err) {
      addLog(`Cart sync failed: ${err.message}. Using client-only cart fallback.`, 'MS-06 Shopping Cart');
      // Local fallback sync
      const savedCart = localStorage.getItem(`cart_${userId}`);
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    }
  };

  const addToCart = async (product, quantity = 1, variantSku = 'default') => {
    const userId = user ? user.userId : 'guest';
    addLog(`Adding ${quantity}x "${product.name}" to cart`, 'MS-06 Shopping Cart');
    
    // Optimistic Update
    const updatedItems = [...cart.items];
    const existingIndex = updatedItems.findIndex(i => i.productId === product.productId && i.variantSku === variantSku);
    
    if (existingIndex > -1) {
      updatedItems[existingIndex].quantity += quantity;
    } else {
      updatedItems.push({
        itemId: `item_${Date.now()}`,
        productId: product.productId || product.id,
        name: product.name,
        price: product.price,
        quantity: quantity,
        variantSku: variantSku,
        image: product.image || 'https://picsum.photos/seed/placeholder/300/200'
      });
    }
    
    const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const newCart = { ...cart, items: updatedItems, totalPrice: newTotal };
    
    setCart(newCart);
    localStorage.setItem(`cart_${userId}`, JSON.stringify(newCart));

    // Async Network Request
    if (user) {
      try {
        const headers = { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const res = await fetch(`/cart/${user.userId}/items`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ productId: product.productId || product.id, quantity, variantSku })
        });
        if (res.ok) {
          const syncedCart = await res.json();
          setCart(syncedCart);
          addLog(`Added to cart successfully synced on server.`, 'MS-06 Shopping Cart');
        }
      } catch (err) {
        addLog(`Cart backend save failed, kept in local state.`, 'MS-06 Shopping Cart');
      }
    }
  };

  const updateCartQty = async (itemId, quantity) => {
    const userId = user ? user.userId : 'guest';
    addLog(`Updating cart item ${itemId} quantity to ${quantity}`, 'MS-06 Shopping Cart');
    
    if (quantity <= 0) {
      removeCartItem(itemId);
      return;
    }

    const updatedItems = cart.items.map(item => {
      if (item.itemId === itemId || item.productId === itemId) {
        return { ...item, quantity };
      }
      return item;
    });

    const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const newCart = { ...cart, items: updatedItems, totalPrice: newTotal };
    setCart(newCart);
    localStorage.setItem(`cart_${userId}`, JSON.stringify(newCart));

    if (user) {
      try {
        const headers = { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const itemObj = cart.items.find(i => i.itemId === itemId || i.productId === itemId);
        const res = await fetch(`/cart/${user.userId}/items/${itemObj?.productId || itemId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ quantity })
        });
        if (res.ok) {
          const syncedCart = await res.json();
          setCart(syncedCart);
        }
      } catch (err) {
        addLog(`Cart server update failed: ${err.message}`, 'MS-06 Shopping Cart');
      }
    }
  };

  const removeCartItem = async (itemId) => {
    const userId = user ? user.userId : 'guest';
    addLog(`Removing item ${itemId} from cart`, 'MS-06 Shopping Cart');
    
    const updatedItems = cart.items.filter(item => item.itemId !== itemId && item.productId !== itemId);
    const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const newCart = { ...cart, items: updatedItems, totalPrice: newTotal };
    setCart(newCart);
    localStorage.setItem(`cart_${userId}`, JSON.stringify(newCart));

    if (user) {
      try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const itemObj = cart.items.find(i => i.itemId === itemId || i.productId === itemId);
        await fetch(`/cart/${user.userId}/items/${itemObj?.productId || itemId}`, {
          method: 'DELETE',
          headers
        });
      } catch (err) {
        addLog(`Cart server delete failed: ${err.message}`, 'MS-06 Shopping Cart');
      }
    }
  };

  const clearCart = async () => {
    const userId = user ? user.userId : 'guest';
    setCart({ items: [], totalPrice: 0 });
    localStorage.removeItem(`cart_${userId}`);
    
    if (user) {
      try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        await fetch(`/cart/${user.userId}`, { method: 'DELETE', headers });
      } catch (err) {
        addLog(`Cart server clear failed`, 'MS-06 Shopping Cart');
      }
    }
  };

  const fetchNotifications = async (userId) => {
    if (!userId) return;
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/notifications/${userId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      // Setup simulated local notifications for order processes
    }
  };

  const loginUser = (userData, userToken) => {
    setToken(userToken);
    setUser(userData);
  };

  const logoutUser = () => {
    addLog(`User logged out.`, 'MS-01 User Service');
    setUser(null);
    setToken(null);
    localStorage.removeItem('shopnow_token');
    localStorage.removeItem('shopnow_user');
  };

  return (
    <AppContext.Provider value={{
      user,
      token,
      cart,
      products,
      loadingProducts,
      notifications,
      systemLogs,
      addLog,
      addToCart,
      updateCartQty,
      removeCartItem,
      clearCart,
      fetchProducts,
      loginUser,
      logoutUser,
      setNotifications,
      setProducts
    }}>
      {children}
    </AppContext.Provider>
  );
};
