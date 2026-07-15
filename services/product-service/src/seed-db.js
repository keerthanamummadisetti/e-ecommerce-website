const mongoose = require('mongoose');
const { Kafka } = require('kafkajs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shopnow_product';
const KAFKA_BROKER = process.env.KAFKA_BROKERS || 'localhost:9092';
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:8085';

// Define Product schema inside seed script to run standalone
const ProductSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  description: { type: String },
  images: [{ type: String }],
  isFeatured: { type: Boolean, default: false },
  averageRating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  attributes: { type: Map, of: mongoose.Schema.Types.Mixed }
});
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const productsData = [
  {
    _id: "00000000-0000-0000-0000-000000000001",
    name: "iPhone 15 Pro Max",
    category: "mobiles",
    price: 139900,
    stock: 25,
    description: "Titanium design with A17 Pro chip, 5x Telephoto camera, and USB-C support.",
    isFeatured: true,
    averageRating: 4.9,
    reviewCount: 238,
    images: ["https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "Apple", color: "Natural Titanium" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000002",
    name: "Samsung Galaxy S24 Ultra",
    category: "mobiles",
    price: 129999,
    stock: 18,
    description: "Galaxy AI-powered flagship with Snapdragon 8 Gen 3, 200MP camera, and built-in S Pen.",
    isFeatured: true,
    averageRating: 4.8,
    reviewCount: 194,
    images: ["https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "Samsung", color: "Titanium Yellow" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000003",
    name: "OnePlus 12 5G",
    category: "mobiles",
    price: 64999,
    stock: 35,
    description: "Elite performance phone with 4th Gen Hasselblad Camera, 100W SuperVOOC charging.",
    isFeatured: false,
    averageRating: 4.7,
    reviewCount: 88,
    images: ["https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "OnePlus", color: "Flowy Emerald" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000004",
    name: "Google Pixel 8 Pro",
    category: "mobiles",
    price: 93999,
    stock: 12,
    description: "Fully upgraded Pixel camera with Google Tensor G3, advanced AI features, and 7 years of updates.",
    isFeatured: true,
    averageRating: 4.6,
    reviewCount: 112,
    images: ["https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "Google", color: "Bay Blue" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000005",
    name: "MacBook Pro 14\" M3 Max",
    category: "laptops",
    price: 199900,
    stock: 8,
    description: "Mind-blowing performance laptop with 14-core CPU, 30-core GPU, Liquid Retina XDR display.",
    isFeatured: true,
    averageRating: 4.9,
    reviewCount: 75,
    images: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "Apple", color: "Space Black" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000006",
    name: "Dell XPS 15 OLED",
    category: "laptops",
    price: 149999,
    stock: 10,
    description: "Stunning 15.6\" 3.5K OLED touch display, Intel Core i9, NVIDIA RTX 4060, premium CNC aluminum.",
    isFeatured: false,
    averageRating: 4.5,
    reviewCount: 64,
    images: ["https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "Dell", color: "Platinum Silver" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000007",
    name: "ASUS ROG Zephyrus G14",
    category: "laptops",
    price: 134990,
    stock: 4,
    description: "Compact 14\" gaming beast with AMD Ryzen 9, RTX 4070, 120Hz Nebula HDR OLED display.",
    isFeatured: true,
    averageRating: 4.7,
    reviewCount: 53,
    images: ["https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "ASUS", color: "Eclipse Gray" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000008",
    name: "HP Spectre x360 2-in-1",
    category: "laptops",
    price: 115999,
    stock: 15,
    description: "Convertible touchscreen laptop with Intel Evo Platform, AI smart features, and long battery life.",
    isFeatured: false,
    averageRating: 4.6,
    reviewCount: 42,
    images: ["https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "HP", color: "Nightfall Black" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000009",
    name: "Sony WH-1000XM5 ANC",
    category: "headphones",
    price: 29990,
    stock: 40,
    description: "Industry-leading wireless noise cancelling headphones with auto optimizer and crystal clear calls.",
    isFeatured: true,
    averageRating: 4.8,
    reviewCount: 312,
    images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "Sony", color: "Silver" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000010",
    name: "Bose QuietComfort Ultra",
    category: "headphones",
    price: 35900,
    stock: 25,
    description: "World-class noise cancellation, breakthrough spatialized audio, and ultra-luxurious comfort.",
    isFeatured: false,
    averageRating: 4.7,
    reviewCount: 185,
    images: ["https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "Bose", color: "Black" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000011",
    name: "Apple AirPods Max",
    category: "headphones",
    price: 59900,
    stock: 14,
    description: "Apple-designed dynamic driver provides high-fidelity audio, Active Noise Cancellation and transparency mode.",
    isFeatured: true,
    averageRating: 4.6,
    reviewCount: 201,
    images: ["https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "Apple", color: "Space Gray" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000012",
    name: "Sennheiser Momentum 4 Wireless",
    category: "headphones",
    price: 24990,
    stock: 30,
    description: "Audiophile-inspired 42mm sound quality with 60-hour battery life, adaptive ANC, and customizable sound.",
    isFeatured: false,
    averageRating: 4.7,
    reviewCount: 95,
    images: ["https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "Sennheiser", color: "White" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000013",
    name: "Apple Watch Ultra 2",
    category: "smartwatches",
    price: 89900,
    stock: 16,
    description: "The ultimate sports and adventure watch. Brightest Always-On Retina display, dual-frequency GPS.",
    isFeatured: true,
    averageRating: 4.9,
    reviewCount: 147,
    images: ["https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "Apple", color: "Titanium" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000014",
    name: "Samsung Galaxy Watch 6 LTE",
    category: "smartwatches",
    price: 27999,
    stock: 22,
    description: "Advanced sleep coaching, personalized heart rate zones, and elegant slim watch face design.",
    isFeatured: false,
    averageRating: 4.5,
    reviewCount: 88,
    images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "Samsung", color: "Graphite" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000015",
    name: "Garmin Fenix 7 Pro Sapphire",
    category: "smartwatches",
    price: 74990,
    stock: 6,
    description: "Solar-powered multisport GPS watch with built-in LED flashlight, preloaded topo maps.",
    isFeatured: true,
    averageRating: 4.8,
    reviewCount: 65,
    images: ["https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "Garmin", color: "Carbon Gray" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000016",
    name: "Fitbit Sense 2 Smartwatch",
    category: "smartwatches",
    price: 20999,
    stock: 28,
    description: "Health and fitness watch with all-day stress management, ECG app, and built-in GPS tracker.",
    isFeatured: false,
    averageRating: 4.3,
    reviewCount: 76,
    images: ["https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "Fitbit", color: "Shadow Grey" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000017",
    name: "Nike Air Max Alpha Sneakers",
    category: "shoes",
    price: 7995,
    stock: 45,
    description: "Max Air cushioning offers stable comfort. Wide, flat base gives enhanced stability and grip.",
    isFeatured: true,
    averageRating: 4.6,
    reviewCount: 154,
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "Nike", color: "Crimson Red" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000018",
    name: "Adidas Ultraboost Light",
    category: "shoes",
    price: 18999,
    stock: 30,
    description: "Continental Rubber outsole, Light BOOST cushioning provides incredible energy return.",
    isFeatured: true,
    averageRating: 4.8,
    reviewCount: 220,
    images: ["https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "Adidas", color: "Core Black" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000019",
    name: "Puma Velocity Nitro 3",
    category: "shoes",
    price: 9999,
    stock: 20,
    description: "NITRO Infused foam midsole, PUMAGRIP high-traction outsole for premium durability and responsiveness.",
    isFeatured: false,
    averageRating: 4.4,
    reviewCount: 68,
    images: ["https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "Puma", color: "Fire Orange" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000020",
    name: "Levi Sherpa Denim Jacket",
    category: "clothing",
    price: 5999,
    stock: 50,
    description: "The original denim jacket since 1967, featuring warm sherpa lining and iconic Levi metal buttons.",
    isFeatured: true,
    averageRating: 4.7,
    reviewCount: 175,
    images: ["https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "Levi's", color: "Stone Wash Denim" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000021",
    name: "Nike Dri-FIT Fleece Hoodie",
    category: "clothing",
    price: 3495,
    stock: 65,
    description: "Dri-FIT technology wicks sweat, soft French terry fleece fabric provides cozy warmth.",
    isFeatured: false,
    averageRating: 4.5,
    reviewCount: 130,
    images: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "Nike", color: "Olive Green" }
  },
  {
    _id: "00000000-0000-0000-0000-000000000022",
    name: "Zara Slim Fit Tweed Blazer",
    category: "clothing",
    price: 7990,
    stock: 15,
    description: "Premium textured tweed fabric, notched lapels, chest welt pocket and front flap pocket design.",
    isFeatured: true,
    averageRating: 4.4,
    reviewCount: 45,
    images: ["https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&auto=format&fit=crop&q=80"],
    attributes: { brand: "Zara", color: "Navy Blue" }
  }
];

const seed = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Clearing existing products in MongoDB...');
    await Product.deleteMany({});

    console.log('Inserting products...');
    await Product.insertMany(productsData);
    console.log('Products inserted successfully in MongoDB.');

    // Kafka setup
    console.log('Connecting to Kafka...');
    const kafka = new Kafka({
      clientId: 'product-seeder',
      brokers: [KAFKA_BROKER]
    });
    const producer = kafka.producer();
    
    let isKafkaOnline = true;
    try {
      await producer.connect();
    } catch (kErr) {
      console.warn('Kafka offline. Skipping search sync events.', kErr.message);
      isKafkaOnline = false;
    }

    if (isKafkaOnline) {
      console.log('Publishing product.created events to Kafka...');
      for (const p of productsData) {
        const event = {
          specversion: '1.0',
          type: 'com.shopnow.product.created',
          source: '/services/product-service',
          id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          time: new Date().toISOString(),
          datacontenttype: 'application/json',
          data: {
            productId: p._id,
            name: p.name,
            category: p.category,
            price: p.price,
            stock: p.stock,
            description: p.description,
            isFeatured: p.isFeatured,
            averageRating: p.averageRating,
            reviewCount: p.reviewCount,
            attributes: p.attributes,
            timestamp: new Date().toISOString()
          }
        };

        await producer.send({
          topic: 'product.created',
          messages: [
            {
              key: p._id,
              value: JSON.stringify(event)
            }
          ]
        });
      }
      await producer.disconnect();
      console.log('All product events published to Kafka.');
    }

    // Call Inventory Service Bulk Update
    console.log('Updating stock in Inventory Service...');
    const bulkUpdates = productsData.map(p => ({
      productId: p._id,
      quantity: p.stock,
      warehouseId: "WH-MUMBAI-01",
      threshold: 5
    }));

    try {
      const response = await fetch(`${INVENTORY_SERVICE_URL}/inventory/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkUpdates),
        signal: AbortSignal.timeout(4000)
      });
      if (response.ok) {
        const resData = await response.json();
        console.log('Inventory stock successfully updated:', resData);
      } else {
        console.warn(`Inventory service returned status ${response.status}`);
      }
    } catch (invErr) {
      console.warn(`Failed to update stock in Inventory Service (${INVENTORY_SERVICE_URL}). Ensure inventory service is running.`, invErr.message);
    }

    await mongoose.disconnect();
    console.log('Seeding finished successfully.');
  } catch (error) {
    console.error('Seeding script failed:', error);
    process.exit(1);
  }
};

seed();
