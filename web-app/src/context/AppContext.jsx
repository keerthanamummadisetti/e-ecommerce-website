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
          name: 'SuperPhone Pro 2026',
          category: 'electronics',
          price: 999.99,
          stock: 45,
          description: 'Flagship device with AI integration and crystal-clear display.',
          isFeatured: true,
          attributes: { brand: 'ShopNow', color: 'Titanium' },
          image: 'https://picsum.photos/seed/phone/600/400'
        },
        {
          id: 'prod-002',
          productId: 'prod-002',
          name: 'Quantum Sound Max Headphones',
          category: 'electronics',
          price: 249.99,
          stock: 120,
          description: 'Active hybrid noise cancelling with spatial audio drivers.',
          isFeatured: true,
          attributes: { brand: 'Acoustic', color: 'Midnight Black' },
          image: 'https://picsum.photos/seed/headphone/600/400'
        },
        {
          id: 'prod-003',
          productId: 'prod-003',
          name: 'Apex Running Sneakers',
          category: 'apparel',
          price: 129.50,
          stock: 15,
          description: 'Lightweight foam cushioning and breathable engineered mesh.',
          isFeatured: false,
          attributes: { brand: 'Apex', color: 'Neon Green' },
          image: 'https://picsum.photos/seed/sneaker/600/400'
        },
        {
          id: 'prod-004',
          productId: 'prod-004',
          name: 'Minimalist Leather Wallet',
          category: 'accessories',
          price: 45.00,
          stock: 200,
          description: 'Genuine full-grain leather with RFID blocking slots.',
          isFeatured: true,
          attributes: { brand: 'Lux', color: 'Tan Brown' },
          image: 'https://picsum.photos/seed/wallet/600/400'
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
