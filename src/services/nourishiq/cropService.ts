import { db, storage } from "@/lib/firebase";
import { ref as dbRef, set, get, child } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  CropProfile,
  FertilizerApplicationRecord,
  PlantHealthInspection,
  CropReminder,
  InventoryItem,
} from "@/types/nourishiq";

const STORAGE_KEYS = {
  CROPS: "nourishiq_crops",
  APPLICATIONS: "nourishiq_applications",
  INSPECTIONS: "nourishiq_inspections",
  REMINDERS: "nourishiq_reminders",
  INVENTORY: "nourishiq_inventory",
  ACTIVE_CROP_ID: "nourishiq_active_crop_id",
};

// Default seed crop for polyhouse demonstration
const DEFAULT_SEED_CROP: CropProfile = {
  id: "crop_tomato_01",
  cropName: "Tomato",
  variety: "Arka Rakshak (High-Yield F1)",
  sowingDate: new Date(Date.now() - 38 * 86400000).toISOString().split("T")[0], // 38 days ago
  transplantingDate: new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0], // 14 days ago
  referenceDateType: "transplanting",
  cultivationMethod: "Cocopeat",
  area: 500,
  areaUnit: "sq_m",
  plantPopulation: 1400,
  plantSpacingCm: 45,
  rowSpacingCm: 80,
  irrigationMethod: "Drip / Fertigation",
  region: "South Polyhouse Zone A",
  soilTestNPK: { n: 120, p: 45, k: 180 },
  soilPH: 6.2,
  soilEC: 1.8,
  notes: "Indeterminate high-wire hybrid tomato on double-leader trellis with bumblebee pollination.",
  createdAt: new Date(Date.now() - 38 * 86400000).toISOString(),
  updatedAt: new Date().toISOString(),
};

const DEFAULT_SEED_APPLICATIONS: FertilizerApplicationRecord[] = [
  {
    id: "app_seed_01",
    cropId: "crop_tomato_01",
    productName: "NPK 19-19-19 (Water Soluble)",
    productType: "Fertilizer",
    npk: { n: 19, p: 19, k: 19 },
    quantity: 4.5,
    unit: "kg",
    applicationDate: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
    applicationMethod: "Drip Fertigation",
    growthStage: "Vegetative",
    status: "Applied",
    notes: "Applied with morning irrigation shot. Substrate EC stabilized at 2.1 mS/cm.",
    costEstimate: 14.4,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: "app_seed_02",
    cropId: "crop_tomato_01",
    productName: "Calcium Nitrate (15.5-0-0 + 19% Ca)",
    productType: "Fertilizer",
    npk: { n: 15.5, p: 0, k: 0 },
    quantity: 3.0,
    unit: "kg",
    applicationDate: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    applicationMethod: "Dedicated Drip Pulse",
    growthStage: "Flowering",
    status: "Applied",
    notes: "Injected from Tank A. Floral trusses showing strong calyx formation.",
    costEstimate: 8.4,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

const DEFAULT_SEED_INVENTORY: InventoryItem[] = [
  {
    id: "inv_191919",
    name: "NPK 19-19-19 (Water Soluble)",
    category: "Fertilizer",
    quantityAvailable: 40.5,
    unit: "kg",
    unitPrice: 3.2,
    purchaseDate: "2026-10-15",
    supplier: "AgTech Solutions Ltd",
    reorderLevel: 15,
  },
  {
    id: "inv_calnit",
    name: "Calcium Nitrate (15.5-0-0 + 19% Ca)",
    category: "Fertilizer",
    quantityAvailable: 47.0,
    unit: "kg",
    unitPrice: 2.8,
    purchaseDate: "2026-10-18",
    supplier: "Yara Agri Dealer",
    reorderLevel: 10,
  },
  {
    id: "inv_potnit",
    name: "Potassium Nitrate (13-0-45)",
    category: "Fertilizer",
    quantityAvailable: 25.0,
    unit: "kg",
    unitPrice: 4.1,
    purchaseDate: "2026-10-20",
    supplier: "Haifa Chemicals",
    reorderLevel: 10,
  },
  {
    id: "inv_bt",
    name: "Dipel Pro / Bio-BT",
    category: "Pesticide",
    quantityAvailable: 5.0,
    unit: "kg",
    unitPrice: 18.5,
    purchaseDate: "2026-10-12",
    supplier: "BioControl Organics",
    reorderLevel: 2,
  },
  {
    id: "inv_neem",
    name: "EcoNeem 10000 ppm",
    category: "Bio-stimulant",
    quantityAvailable: 8.0,
    unit: "L",
    unitPrice: 12.0,
    purchaseDate: "2026-10-10",
    supplier: "BioControl Organics",
    reorderLevel: 3,
  },
];

export const cropService = {
  // ── Crops ──────────────────────────────────────────────────────────
  async getCrops(): Promise<CropProfile[]> {
    // Try Firebase RTDB first
    try {
      const snapshot = await get(child(dbRef(db), "cropcare/cropProfiles"));
      if (snapshot.exists()) {
        const val = snapshot.val();
        const cropsList: CropProfile[] = Object.values(val);
        if (cropsList.length > 0) {
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.CROPS, JSON.stringify(cropsList));
          }
          return cropsList;
        }
      }
    } catch {
      // Fallback to local storage if offline / unauthenticated
    }

    if (typeof window !== "undefined") {
      const local = localStorage.getItem(STORAGE_KEYS.CROPS);
      if (local) {
        try {
          return JSON.parse(local);
        } catch {
          // ignore
        }
      }
      // Seed default crop
      localStorage.setItem(STORAGE_KEYS.CROPS, JSON.stringify([DEFAULT_SEED_CROP]));
    }
    return [DEFAULT_SEED_CROP];
  },

  async saveCrop(crop: CropProfile): Promise<void> {
    const crops = await this.getCrops();
    const index = crops.findIndex((c) => c.id === crop.id);
    if (index >= 0) {
      crops[index] = { ...crop, updatedAt: new Date().toISOString() };
    } else {
      crops.push(crop);
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.CROPS, JSON.stringify(crops));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CROP_ID, crop.id);
    }

    try {
      await set(dbRef(db, `cropcare/cropProfiles/${crop.id}`), crop);
    } catch {
      // Offline fallback preserved
    }
  },

  async deleteCrop(cropId: string): Promise<void> {
    const crops = (await this.getCrops()).filter((c) => c.id !== cropId);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.CROPS, JSON.stringify(crops));
    }
    try {
      await set(dbRef(db, `cropcare/cropProfiles/${cropId}`), null);
    } catch {
      // Offline fallback
    }
  },

  // ── Applications ───────────────────────────────────────────────────
  async getApplications(cropId?: string): Promise<FertilizerApplicationRecord[]> {
    try {
      const snapshot = await get(child(dbRef(db), "cropcare/fertilizerApplications"));
      if (snapshot.exists()) {
        const val = snapshot.val();
        const list: FertilizerApplicationRecord[] = Object.values(val);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(list));
        }
        return cropId ? list.filter((a) => a.cropId === cropId) : list;
      }
    } catch {
      // Fallback
    }

    if (typeof window !== "undefined") {
      const local = localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
      if (local) {
        try {
          const list: FertilizerApplicationRecord[] = JSON.parse(local);
          return cropId ? list.filter((a) => a.cropId === cropId) : list;
        } catch {
          // ignore
        }
      }
      localStorage.setItem(
        STORAGE_KEYS.APPLICATIONS,
        JSON.stringify(DEFAULT_SEED_APPLICATIONS)
      );
    }
    return cropId
      ? DEFAULT_SEED_APPLICATIONS.filter((a) => a.cropId === cropId)
      : DEFAULT_SEED_APPLICATIONS;
  },

  async logApplication(record: FertilizerApplicationRecord): Promise<void> {
    const all = await this.getApplications();
    const index = all.findIndex((a) => a.id === record.id);
    if (index >= 0) {
      all[index] = record;
    } else {
      all.unshift(record);
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(all));
    }

    try {
      await set(dbRef(db, `cropcare/fertilizerApplications/${record.id}`), record);
    } catch {
      // Offline fallback
    }

    // Automatically deduct from inventory if product exists and status is Applied
    if (record.status === "Applied") {
      await this.deductInventoryStock(record.productName, record.quantity);
    }
  },

  // ── Plant Health Inspections ────────────────────────────────────────
  async getInspections(cropId?: string): Promise<PlantHealthInspection[]> {
    try {
      const snapshot = await get(child(dbRef(db), "cropcare/plantHealthInspections"));
      if (snapshot.exists()) {
        const val = snapshot.val();
        const list: PlantHealthInspection[] = Object.values(val);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEYS.INSPECTIONS, JSON.stringify(list));
        }
        return cropId ? list.filter((i) => i.cropId === cropId) : list;
      }
    } catch {
      // Fallback
    }

    if (typeof window !== "undefined") {
      const local = localStorage.getItem(STORAGE_KEYS.INSPECTIONS);
      if (local) {
        try {
          const list: PlantHealthInspection[] = JSON.parse(local);
          return cropId ? list.filter((i) => i.cropId === cropId) : list;
        } catch {
          // ignore
        }
      }
    }
    return [];
  },

  async saveInspection(inspection: PlantHealthInspection): Promise<void> {
    const all = await this.getInspections();
    const index = all.findIndex((i) => i.id === inspection.id);
    if (index >= 0) {
      all[index] = inspection;
    } else {
      all.unshift(inspection);
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.INSPECTIONS, JSON.stringify(all));
    }

    try {
      await set(dbRef(db, `cropcare/plantHealthInspections/${inspection.id}`), inspection);
    } catch {
      // Offline fallback
    }
  },

  // ── Reminders ──────────────────────────────────────────────────────
  async getReminders(cropId?: string): Promise<CropReminder[]> {
    try {
      const snapshot = await get(child(dbRef(db), "cropcare/cropReminders"));
      if (snapshot.exists()) {
        const val = snapshot.val();
        const list: CropReminder[] = Object.values(val);
        return cropId ? list.filter((r) => r.cropId === cropId) : list;
      }
    } catch {
      // Fallback
    }

    if (typeof window !== "undefined") {
      const local = localStorage.getItem(STORAGE_KEYS.REMINDERS);
      if (local) {
        try {
          const list: CropReminder[] = JSON.parse(local);
          return cropId ? list.filter((r) => r.cropId === cropId) : list;
        } catch {
          // ignore
        }
      }
    }

    const defaultReminders: CropReminder[] = [
      {
        id: "rem_01",
        cropId: "crop_tomato_01",
        type: "Fertilizer",
        title: "Flowering Stage Calcium Pulse",
        description: "Inject 3.0 kg Calcium Nitrate via Tank A to maintain blossom tissue vigor.",
        dueDate: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
        status: "Pending",
        priority: "High",
      },
      {
        id: "rem_02",
        cropId: "crop_tomato_01",
        type: "Health Inspection",
        title: "Lower Canopy Alternaria Follow-up",
        description: "Check undersides of leaves on Row 4 for early blight lesion drying.",
        dueDate: new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0],
        status: "Pending",
        priority: "Medium",
      },
    ];

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(defaultReminders));
    }
    return cropId
      ? defaultReminders.filter((r) => r.cropId === cropId)
      : defaultReminders;
  },

  async saveReminder(reminder: CropReminder): Promise<void> {
    const all = await this.getReminders();
    const index = all.findIndex((r) => r.id === reminder.id);
    if (index >= 0) {
      all[index] = reminder;
    } else {
      all.push(reminder);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(all));
    }
    try {
      await set(dbRef(db, `cropcare/cropReminders/${reminder.id}`), reminder);
    } catch {
      // Offline fallback
    }
  },

  // ── Inventory ──────────────────────────────────────────────────────
  async getInventory(): Promise<InventoryItem[]> {
    try {
      const snapshot = await get(child(dbRef(db), "cropcare/cropInventory"));
      if (snapshot.exists()) {
        const val = snapshot.val();
        const list: InventoryItem[] = Object.values(val);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(list));
        }
        return list;
      }
    } catch {
      // Fallback
    }

    if (typeof window !== "undefined") {
      const local = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      if (local) {
        try {
          return JSON.parse(local);
        } catch {
          // ignore
        }
      }
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(DEFAULT_SEED_INVENTORY));
    }
    return DEFAULT_SEED_INVENTORY;
  },

  async saveInventoryItem(item: InventoryItem): Promise<void> {
    const all = await this.getInventory();
    const index = all.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      all[index] = item;
    } else {
      all.push(item);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(all));
    }
    try {
      await set(dbRef(db, `cropcare/cropInventory/${item.id}`), item);
    } catch {
      // Offline fallback
    }
  },

  async deductInventoryStock(productName: string, quantityToDeduct: number): Promise<void> {
    const inventory = await this.getInventory();
    const item = inventory.find((i) =>
      i.name.toLowerCase().includes(productName.toLowerCase()) ||
      productName.toLowerCase().includes(i.name.toLowerCase())
    );
    if (item) {
      item.quantityAvailable = Math.max(0, +(item.quantityAvailable - quantityToDeduct).toFixed(2));
      await this.saveInventoryItem(item);
    }
  },

  // ── Image Upload ───────────────────────────────────────────────────
  async uploadPlantImage(file: File, cropId: string): Promise<string> {
    // Attempt Firebase Storage
    try {
      const timestamp = Date.now();
      const imagePath = `cropcare/inspections/${cropId}/${timestamp}_${file.name}`;
      const imageRef = storageRef(storage, imagePath);
      const snapshot = await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch {
      // If Storage credentials aren't configured or offline, create an Object URL for local browser preview
      if (typeof window !== "undefined") {
        return URL.createObjectURL(file);
      }
      return "/images/polyhouse_tunnel.jpg";
    }
  },
};

