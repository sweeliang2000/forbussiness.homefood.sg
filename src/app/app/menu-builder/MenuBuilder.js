'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './MenuBuilder.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import { Button, Checkbox, Dialog, FormControlLabel, IconButton, Menu, MenuItem, Radio, RadioGroup, Select, Switch, TextField, Typography } from '@mui/material';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import DialogPopup from '@/components/DialogPopup/DialogPopup';
import DragDropImageUploader from '@/components/Form Components/DragDropImageUploader/DragDropImageUploader';

const makeId = () => Math.random().toString(36).slice(2, 10);

const formatMoney = (value) => {
  const num = Number(value) || 0;
  return `$${num.toFixed(2)}`;
};

const normalizeNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const arrayMove = (arr, fromIndex, toIndex) => {
  const copy = [...arr];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
};

const PRICING_OVERRIDE_TYPES = {
  GLOBAL: 'global',
  CUSTOM_PERCENT: 'custom_percent',
  FIXED_PRICE: 'fixed_price',
  EXEMPT: 'exempt',
};

const DEFAULT_STORE_PRICING = {
  serviceEnabled: true,
  servicePercent: 10,
  gstEnabled: true,
  gstPercent: 9,
};

const getDefaultItem = (categoryId) => ({
  id: null,
  categoryIds: categoryId ? [categoryId] : [],
  photo: null, // { name, url }
  name: '',
  description: '',
  takeawayBasePrice: 0,
  dineInPrice: 0,
  soldOut: false,
  featured: false,
  availableTakeaway: true,
  availableDineIn: true,
  pricingOverrideType: PRICING_OVERRIDE_TYPES.GLOBAL,
  pricingOverrideCustomPercent: 0,
  pricingOverrideFixedPrice: 0,
  optionGroups: [],
});

const getItemEditorPhotoFromItem = (item) => {
  if (!item?.photo?.url) return [];
  return [{ name: item.photo.name ?? 'photo', url: item.photo.url }];
};

const computeBaseForFees = ({ item, fulfilmentMode }) => {
  if (fulfilmentMode === 'dine-in') {
    return normalizeNumber(item.dineInPrice);
  }
  return normalizeNumber(item.takeawayBasePrice);
};

const computeOptionsDelta = ({ selectedGroupOptionQtys, item }) => {
  const groups = item.optionGroups ?? [];
  const sel = selectedGroupOptionQtys ?? {};
  let sum = 0;
  for (const g of groups) {
    const gSel = sel[g.id] ?? {};
    for (const opt of (g.options ?? [])) {
      const qty = gSel[opt.id] ?? 0;
      sum += qty * normalizeNumber(opt.additionalPrice);
    }
  }
  return sum;
};

const buildDefaultGroupSelections = (item) => {
  const out = {};
  for (const g of (item?.optionGroups ?? [])) {
    const pick = normalizeNumber(g.pick ?? 0);
    if (!g.required || pick <= 0) continue;
    const opts = g.options ?? [];
    if (!opts.length) continue;
    const gSel = {};
    // Default: pick the first N options (qty=1 each).
    for (let i = 0; i < Math.min(pick, opts.length); i += 1) {
      gSel[opts[i].id] = 1;
    }
    out[g.id] = gSel;
  }
  return out;
};

export default function MenuBuilder() {
  // Store level pricing settings.
  // This mock intentionally does not expose a UI to edit these values.
  const storePricing = DEFAULT_STORE_PRICING;

  // Categories are kept in an ordered array for drag-to-reorder.
  const [categories, setCategories] = useState([
    { id: 'cat-starters', name: 'Starters', isVisible: true },
    { id: 'cat-main', name: 'Main Meals', isVisible: true },
  ]);

  // Items are kept as a flat list with categoryId.
  const [items, setItems] = useState(() => [
    {
      id: 'item-wings',
      categoryIds: ['cat-starters'],
      photo: null,
      name: 'Chicken Wings',
      description: 'Crispy wings with your choice of spice level.',
      takeawayBasePrice: 12.0,
      dineInPrice: 14.0,
      soldOut: false,
      featured: true,
      availableTakeaway: true,
      availableDineIn: true,
      pricingOverrideType: PRICING_OVERRIDE_TYPES.GLOBAL,
      pricingOverrideCustomPercent: 0,
      pricingOverrideFixedPrice: 0,
      optionGroups: [
        {
          id: 'og-spice',
          name: 'Spice level',
          required: true,
          pick: 1,
          options: [
            { id: 'opt-mild', name: 'Mild', additionalPrice: 0, maxQty: 1 },
            { id: 'opt-spicy', name: 'Spicy', additionalPrice: 1.0, maxQty: 1 },
          ],
        },
        {
          id: 'og-addons',
          name: 'Add Ons',
          required: false,
          pick: 0, // 0 = unlimited
          options: [
            { id: 'opt-extra-sauce', name: 'Extra Sauce', additionalPrice: 0.5, maxQty: 3 },
            { id: 'opt-cheese-dust', name: 'Cheese Dust', additionalPrice: 1.0, maxQty: 2 },
          ],
        },
      ],
    },
    {
      id: 'item-steak',
      categoryIds: ['cat-main'],
      photo: null,
      name: 'Garlic Butter Steak',
      description: 'Juicy steak with garlic butter sauce.',
      takeawayBasePrice: 28.0,
      dineInPrice: 32.0,
      soldOut: false,
      featured: false,
      availableTakeaway: true,
      availableDineIn: true,
      pricingOverrideType: PRICING_OVERRIDE_TYPES.CUSTOM_PERCENT,
      pricingOverrideCustomPercent: 5,
      pricingOverrideFixedPrice: 0,
      optionGroups: [
        {
          id: 'og-cook',
          name: 'Cooking',
          required: true,
          pick: 1,
          options: [{ id: 'opt-grilled', name: 'Grilled', additionalPrice: 0, maxQty: 1 }],
        },
        {
          id: 'og-addons-steak',
          name: 'Add Ons',
          required: false,
          pick: 0,
          options: [{ id: 'opt-salad', name: 'Side Salad', additionalPrice: 4.0, maxQty: 1 }],
        },
      ],
    },
  ]);

  // Category creation.
  const [newCategoryName, setNewCategoryName] = useState('');
  const [draggingCategoryId, setDraggingCategoryId] = useState(null);
  const [blockedDeleteCategoryName, setBlockedDeleteCategoryName] = useState(null);

  const handleDeleteCategory = (cat) => {
    const inUse = items.some((i) => (i.categoryIds ?? []).includes(cat.id));
    if (inUse) {
      setBlockedDeleteCategoryName(cat.name);
    } else {
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    }
  };

  // Store acceptance: whether the shop accepts takeaway, dine-in, or both.
  const [shopAcceptance, setShopAcceptance] = useState('takeaway'); // 'takeaway' | 'dine-in' | 'both'

  // Customer mode for the preview (what the merchant wants to preview).
  const [customerMode, setCustomerMode] = useState('takeaway'); // 'takeaway' | 'dine-in'

  // Preview selection state.
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selectedGroupOptionQtys, setSelectedGroupOptionQtys] = useState({});
  const [isPreviewAddOpen, setIsPreviewAddOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]); // { id, itemId, itemName, mode, selections, pricingTotal }
  const [isCartDeleteOpen, setIsCartDeleteOpen] = useState(false);
  const [cartDeleteTargetItemId, setCartDeleteTargetItemId] = useState(null);
  const [isPreviewFullscreenOpen, setIsPreviewFullscreenOpen] = useState(false);

  const selectedItem = useMemo(() => items.find((i) => i.id === selectedItemId) ?? null, [items, selectedItemId]);
  const previewCartQtyByItemId = useMemo(() => {
    const map = {};
    for (const ci of cartItems) {
      map[ci.itemId] = (map[ci.itemId] ?? 0) + 1;
    }
    return map;
  }, [cartItems]);
  const closePreviewAdd = () => setIsPreviewAddOpen(false);

  const openPreviewAdd = (item) => {
    setSelectedItemId(item.id);
    setSelectedGroupOptionQtys(buildDefaultGroupSelections(item));
    setIsPreviewAddOpen(true);
  };

  const openCartDeletePopup = (itemId) => {
    setCartDeleteTargetItemId(itemId);
    setIsCartDeleteOpen(true);
  };

  const removeOneCartItemByItemId = (itemId) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((x) => x.itemId === itemId);
      if (idx < 0) return prev;
      const copy = [...prev];
      copy.splice(idx, 1);
      return copy;
    });
  };

  useEffect(() => {
    // If the shop doesn't accept a mode, force the preview mode to the accepted one.
    if (shopAcceptance === 'takeaway') setCustomerMode('takeaway');
    if (shopAcceptance === 'dine-in') setCustomerMode('dine-in');
  }, [shopAcceptance]);

  useEffect(() => {
    // When switching preview mode, clear the selection so the preview always matches
    // "what customer can order".
    setSelectedItemId(null);
    setSelectedGroupOptionQtys({});
    setIsPreviewAddOpen(false);
    setCartItems([]);
    setIsCartDeleteOpen(false);
    setCartDeleteTargetItemId(null);
  }, [customerMode]);

  useEffect(() => {
    if (!selectedItemId) return;
    const stillExists = items.some((i) => i.id === selectedItemId);
    if (!stillExists) {
      setSelectedItemId(null);
      setSelectedGroupOptionQtys({});
    }
  }, [items, selectedItemId]);

  const visibleCategories = useMemo(() => {
    // Keep category order exactly as the user arranged it.
    return categories.filter((c) => c.isVisible);
  }, [categories]);

  const itemsByCategory = useMemo(() => {
    const map = new Map();
    for (const c of categories) map.set(c.id, []);
    for (const i of items) {
      for (const catId of (i.categoryIds ?? [])) {
        if (!map.has(catId)) map.set(catId, []);
        map.get(catId).push(i);
      }
    }
    return map;
  }, [categories, items]);

  const startReorder = (categoryId) => setDraggingCategoryId(categoryId);
  const stopReorder = () => setDraggingCategoryId(null);

  const handleDropOnCategory = (targetCategoryId) => {
    if (!draggingCategoryId || draggingCategoryId === targetCategoryId) return;
    const fromIndex = categories.findIndex((c) => c.id === draggingCategoryId);
    const toIndex = categories.findIndex((c) => c.id === targetCategoryId);
    if (fromIndex < 0 || toIndex < 0) return;
    setCategories((prev) => arrayMove(prev, fromIndex, toIndex));
    stopReorder();
  };

  // Item editor modal.
  const [isItemEditorOpen, setIsItemEditorOpen] = useState(false);
  const [itemEditor, setItemEditor] = useState(getDefaultItem(categories?.[0]?.id));
  const [editorPhotoImages, setEditorPhotoImages] = useState([]);

  // Per-item gear-menu anchor: { itemId, el }
  const [itemMenuAnchor, setItemMenuAnchor] = useState(null);
  const openItemMenu = (e, itemId) => setItemMenuAnchor({ el: e.currentTarget, itemId });
  const closeItemMenu = () => setItemMenuAnchor(null);

  const previewRef = useRef(null);
  const openPreviewFullscreen = () => setIsPreviewFullscreenOpen(true);
  const closePreviewFullscreen = () => setIsPreviewFullscreenOpen(false);

  const openNewItemEditor = () => {
    const firstCategoryId = categories?.[0]?.id ?? null;
    setItemEditor(getDefaultItem(firstCategoryId));
    setEditorPhotoImages([]);
    setIsItemEditorOpen(true);
  };

  const openEditItemEditor = (item) => {
    setItemEditor({ ...item });
    setEditorPhotoImages(getItemEditorPhotoFromItem(item));
    setIsItemEditorOpen(true);
  };

  const closeItemEditor = () => {
    setIsItemEditorOpen(false);
  };

  const setItemEditorField = (patch) => {
    setItemEditor((prev) => ({ ...prev, ...patch }));
  };

  const handleItemEditorSubmit = (event) => {
    event.preventDefault();

    const photo = editorPhotoImages?.length
      ? { name: editorPhotoImages[0].name ?? 'photo', url: editorPhotoImages[0].url }
      : null;

    if (!itemEditor?.name?.trim()) return;
    if (!itemEditor.categoryIds?.length) return;

    const normalizedItem = {
      ...itemEditor,
      takeawayBasePrice: normalizeNumber(itemEditor.takeawayBasePrice),
      dineInPrice: normalizeNumber(itemEditor.dineInPrice),
      pricingOverrideCustomPercent: normalizeNumber(itemEditor.pricingOverrideCustomPercent),
      pricingOverrideFixedPrice: normalizeNumber(itemEditor.pricingOverrideFixedPrice),
      photo,
      optionGroups: (itemEditor.optionGroups ?? []).map((g) => ({
        id: g.id ?? makeId(),
        name: (g.name ?? '').trim(),
        required: !!g.required,
        pick: Math.max(0, normalizeNumber(g.pick ?? 0)),
        options: (g.options ?? [])
          .map((o) => ({
            id: o.id ?? makeId(),
            name: (o.name ?? '').trim(),
            additionalPrice: normalizeNumber(o.additionalPrice),
            maxQty: Math.max(1, normalizeNumber(o.maxQty ?? 1)),
          }))
          .filter((o) => !!o.name),
      })).filter((g) => !!g.name),
    };

    setItems((prev) => {
      if (normalizedItem.id) {
        return prev.map((x) => (x.id === normalizedItem.id ? normalizedItem : x));
      }
      return [
        ...prev,
        {
          ...normalizedItem,
          id: makeId(),
        },
      ];
    });

    closeItemEditor();
  };

  const deleteItem = (itemId) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleQuickSoldOut = (itemId, nextValue) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, soldOut: nextValue } : i)));
  };

  const handleQuickFeatured = (itemId, nextValue) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, featured: nextValue } : i)));
  };

  const handleQuickAvailability = (itemId, patch) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
  };

  const handlePublishMenu = () => {
    const payload = {
      storePricing,
      categories: categories.map((c, idx) => ({
        id: c.id,
        name: c.name,
        isVisible: c.isVisible,
        sortIndex: idx,
      })),
      items: items.map((i) => ({
        id: i.id,
        categoryIds: i.categoryIds ?? [],
        photo: i.photo ? { name: i.photo.name, url: i.photo.url } : null,
        name: i.name,
        description: i.description,
        takeawayBasePrice: normalizeNumber(i.takeawayBasePrice),
        dineInPrice: normalizeNumber(i.dineInPrice),
        soldOut: !!i.soldOut,
        featured: !!i.featured,
        availability: {
          takeaway: !!i.availableTakeaway,
          dineIn: !!i.availableDineIn,
        },
        pricingOverrideType: i.pricingOverrideType,
        pricingOverride: {
          customPercent: normalizeNumber(i.pricingOverrideCustomPercent),
          fixedPrice: normalizeNumber(i.pricingOverrideFixedPrice),
        },
        optionGroups: (i.optionGroups ?? []).map((g) => ({
          id: g.id,
          name: g.name,
          required: !!g.required,
          pick: normalizeNumber(g.pick ?? 0),
          options: (g.options ?? []).map((o) => ({
            id: o.id,
            name: o.name,
            additionalPrice: normalizeNumber(o.additionalPrice),
            maxQty: Math.max(1, normalizeNumber(o.maxQty ?? 1)),
          })),
        })),
      })),
    };

    // UI-only mock: this is where the backend integration will be wired later.
    console.log('[MenuBuilder] publish payload:', payload);
  };

  // Preview computations for the currently selected item, for the current preview mode.
  const previewPricing = useMemo(() => {
    if (!selectedItem) return null;

    const computePreviewPricingForMode = (mode) => {
      const baseForFees = computeBaseForFees({ item: selectedItem, fulfilmentMode: mode });
      const optionsDelta = computeOptionsDelta({ selectedGroupOptionQtys, item: selectedItem });

      let fee = 0;
      let feeBreakdown = null;

      if (selectedItem.pricingOverrideType === PRICING_OVERRIDE_TYPES.EXEMPT) {
        feeBreakdown = { type: PRICING_OVERRIDE_TYPES.EXEMPT, fee: 0 };
        fee = 0;
      } else if (selectedItem.pricingOverrideType === PRICING_OVERRIDE_TYPES.CUSTOM_PERCENT) {
        const pct = normalizeNumber(selectedItem.pricingOverrideCustomPercent);
        fee = baseForFees * (pct / 100);
        feeBreakdown = { type: PRICING_OVERRIDE_TYPES.CUSTOM_PERCENT, percent: pct, fee };
      } else if (selectedItem.pricingOverrideType === PRICING_OVERRIDE_TYPES.FIXED_PRICE) {
        const fixed = normalizeNumber(selectedItem.pricingOverrideFixedPrice);
        fee = fixed;
        feeBreakdown = { type: PRICING_OVERRIDE_TYPES.FIXED_PRICE, fixedPrice: fixed, fee };
      } else {
        // GLOBAL: remove Service & GST from calculation for this preview.
        // (Spice level MUST pick additional prices will also not get any Service/GST uplift.)
        fee = 0;
        feeBreakdown = {
          type: PRICING_OVERRIDE_TYPES.GLOBAL,
          serviceEnabled: false,
          servicePercent: normalizeNumber(storePricing.servicePercent),
          serviceAmount: 0,
          gstEnabled: false,
          gstPercent: normalizeNumber(storePricing.gstPercent),
          gstAmount: 0,
        };
      }

      const dineInDelta = mode === 'dine-in'
        ? normalizeNumber(selectedItem.dineInPrice) - normalizeNumber(selectedItem.takeawayBasePrice)
        : 0;

      const total = baseForFees + fee + optionsDelta;

      return {
        baseForFees,
        dineInDelta,
        fee,
        feeBreakdown,
        optionsDelta,
        total,
      };
    };

    return computePreviewPricingForMode(customerMode);
  }, [selectedItem, selectedGroupOptionQtys, customerMode, storePricing]);

  const canOrderSelectedItem = useMemo(() => {
    if (!selectedItem) return false;
    if (selectedItem.soldOut) return false;

    if (customerMode === 'takeaway') return selectedItem.availableTakeaway;
    if (customerMode === 'dine-in') return selectedItem.availableDineIn;
    return selectedItem.availableTakeaway || selectedItem.availableDineIn;
  }, [selectedItem, customerMode]);

  const isPreviewSelectionValid = useMemo(() => {
    if (!selectedItem) return false;
    const sel = selectedGroupOptionQtys ?? {};
    for (const g of (selectedItem.optionGroups ?? [])) {
      if (!g.required) continue;
      const requiredPick = normalizeNumber(g.pick ?? 0) > 0 ? normalizeNumber(g.pick ?? 0) : 1;
      const gSel = sel[g.id] ?? {};
      const count = Object.values(gSel).reduce((s, q) => s + (q > 0 ? 1 : 0), 0);
      if (count !== requiredPick) return false;
    }
    return true;
  }, [selectedItem, selectedGroupOptionQtys]);

  const renderPricingBreakdown = (pricing, mode) => {
    if (!pricing) return null;

    return (
      <div>
        <div className={styles.breakdownLine}>
          <span className={styles.muted}>{mode === 'dine-in' ? 'Dine-in price' : 'Takeaway price'}</span>
          <span style={{ fontWeight: 800 }}>{formatMoney(pricing.baseForFees)}</span>
        </div>

        {pricing.dineInDelta > 0 ? (
          <div className={styles.breakdownLine}>
            <span className={styles.muted}>Dine-in uplift</span>
            <span style={{ fontWeight: 800 }}>+{formatMoney(pricing.dineInDelta)}</span>
          </div>
        ) : null}

        {pricing.feeBreakdown?.type === PRICING_OVERRIDE_TYPES.EXEMPT ? (
          <div className={styles.breakdownLine}>
            <span className={styles.muted}>Service/GST</span>
            <span style={{ fontWeight: 800 }}>Skipped</span>
          </div>
        ) : null}

        {pricing.feeBreakdown?.type === PRICING_OVERRIDE_TYPES.CUSTOM_PERCENT ? (
          <div className={styles.breakdownLine}>
            <span className={styles.muted}>Custom surcharge ({pricing.feeBreakdown.percent}%)</span>
            <span style={{ fontWeight: 800 }}>{formatMoney(pricing.fee)}</span>
          </div>
        ) : null}

        {pricing.feeBreakdown?.type === PRICING_OVERRIDE_TYPES.FIXED_PRICE ? (
          <div className={styles.breakdownLine}>
            <span className={styles.muted}>Fixed surcharge</span>
            <span style={{ fontWeight: 800 }}>{formatMoney(pricing.fee)}</span>
          </div>
        ) : null}

        {pricing.feeBreakdown?.type === PRICING_OVERRIDE_TYPES.GLOBAL ? (
          <div>
            {pricing.feeBreakdown.serviceEnabled ? (
              <div className={styles.breakdownLine}>
                <span className={styles.muted}>Service ({pricing.feeBreakdown.servicePercent}%)</span>
                <span style={{ fontWeight: 800 }}>+{formatMoney(pricing.feeBreakdown.serviceAmount)}</span>
              </div>
            ) : null}
            {pricing.feeBreakdown.gstEnabled ? (
              <div className={styles.breakdownLine}>
                <span className={styles.muted}>GST ({pricing.feeBreakdown.gstPercent}%)</span>
                <span style={{ fontWeight: 800 }}>+{formatMoney(pricing.feeBreakdown.gstAmount)}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {pricing.optionsDelta ? (
          <div className={styles.breakdownLine}>
            <span className={styles.muted}>Options</span>
            <span style={{ fontWeight: 800 }}>+{formatMoney(pricing.optionsDelta)}</span>
          </div>
        ) : null}

        <div className={styles.totalLine}>
          <span>Total (checkout)</span>
          <span>{formatMoney(pricing.total)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.root}>
      <div className={styles.stickyHeader}>
        <HeaderSection
          noMaxWidth
          title="Menu Builder"
          description={
            <p>
              Set up categories, items, and pricing rules. All data stays in local state for this mock.
            </p>
          }
          buttonText="Save Menu / Publish"
          rightActions={
            <IconButton
              className={styles.mobilePreviewButton}
              size="small"
              onClick={openPreviewFullscreen}
              title="Open menu preview"
            >
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          }
          onClick={handlePublishMenu}
          showCancelButton={false}
        />
      </div>

      <div className={styles.layout}>
        <div className={styles.cardStack}>
          <ContentCard>
            <div className={styles.sectionHeader}>
              <FieldHeader
                title="Shop accepts"
                type="h3"
                description="Customers can order takeaway only, dine-in only, or both."
              />
            </div>

            <div className={styles.row} style={{ justifyContent: 'space-between' }}>
              <RadioGroup row value={shopAcceptance} onChange={(e) => setShopAcceptance(e.target.value)}>
                <FormControlLabel value="takeaway" control={<Radio size="small" />} label="Takeaway only" />
                <FormControlLabel value="dine-in" control={<Radio size="small" />} label="Dine-in only" />
                <FormControlLabel value="both" control={<Radio size="small" />} label="Both" />
              </RadioGroup>
            </div>
          </ContentCard>

          <ContentCard>
            <div className={styles.sectionHeader}>
              <FieldHeader title="Categories" type="h3" description="Create, reorder (drag), and toggle visibility." />
            </div>

            <div className={styles.row} style={{ marginBottom: 12 }}>
              <TextField
                label="New category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Drinks"
                size="small"
              />
              <Button
                variant="contained"
                onClick={() => {
                  const name = newCategoryName.trim();
                  if (!name) return;
                  setCategories((prev) => [...prev, { id: makeId(), name, isVisible: true }]);
                  setNewCategoryName('');
                }}
              >
                Add Category
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={styles.categoryRow}
                  draggable
                  aria-grabbed={draggingCategoryId === cat.id}
                  onDragStart={() => startReorder(cat.id)}
                  onDragEnd={() => stopReorder()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropOnCategory(cat.id)}
                  title="Drag to reorder"
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className={styles.dragHandle}>≡</span>
                    <div>
                      <Typography variant="subtitle1" style={{ fontWeight: 800 }}>{cat.name}</Typography>
                      <Typography variant="caption" className={styles.muted}>
                        Visible: {cat.isVisible ? 'Yes' : 'No'}
                      </Typography>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Switch
                      checked={cat.isVisible}
                      onChange={(e) => setCategories((prev) => prev.map((x) => (x.id === cat.id ? { ...x, isVisible: e.target.checked } : x)))}
                      size="small"
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteCategory(cat)}
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          </ContentCard>

          <ContentCard>
            <div className={styles.sectionHeader}>
              <div className={styles.row} style={{ justifyContent: 'space-between' }}>
                <FieldHeader title="Items" type="h3" description="Add/edit/delete items with photo, pricing, and sold-out/featured toggles." />
                <Button variant="contained" onClick={openNewItemEditor}>
                  Add Item
                </Button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {categories.map((cat) => {
                const catItems = itemsByCategory.get(cat.id) ?? [];
                return (
                  <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className={styles.row} style={{ justifyContent: 'space-between' }}>
                      <Typography variant="h6" style={{ fontWeight: 900 }}>{cat.name}</Typography>
                      <Typography variant="caption" className={styles.muted}>
                        {catItems.length} item{catItems.length === 1 ? '' : 's'}
                      </Typography>
                    </div>

                    {catItems.length === 0 ? (
                      <Typography variant="body2" className={styles.muted}>No items yet.</Typography>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {catItems.map((item) => (
                          <div key={item.id} className={styles.itemRow}>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 260 }}>
                              {item.photo?.url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img className={styles.thumb} src={item.photo.url} alt={item.name} />
                              ) : (
                                <div className={styles.thumb} />
                              )}
                              <div style={{ minWidth: 190 }}>
                                <Typography style={{ fontWeight: 900 }}>{item.name}</Typography>
                                <Typography variant="caption" className={styles.muted}>
                                  {shopAcceptance !== 'dine-in' && <>Takeaway: {formatMoney(item.takeawayBasePrice)}</>}
                                  {shopAcceptance === 'both' && ' · '}
                                  {shopAcceptance !== 'takeaway' && <>Dine-in: {formatMoney(item.dineInPrice)}</>}
                                </Typography>
                              </div>
                            </div>

                            <div className={styles.row} style={{ gap: 10 }}>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <Typography variant="caption" className={styles.muted}>Sold out</Typography>
                                <Switch checked={!!item.soldOut} onChange={(e) => handleQuickSoldOut(item.id, e.target.checked)} size="small" />
                              </div>
                              <IconButton size="small" onClick={(e) => openItemMenu(e, item.id)}>
                                <SettingsRoundedIcon fontSize="small" />
                              </IconButton>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ContentCard>

          {/* Gear dropdown — shared across all item rows */}
          <Menu
            anchorEl={itemMenuAnchor?.el}
            open={!!itemMenuAnchor}
            onClose={closeItemMenu}
          >
            <MenuItem
              onClick={() => {
                const item = items.find((i) => i.id === itemMenuAnchor?.itemId);
                if (item) openEditItemEditor(item);
                closeItemMenu();
              }}
            >
              Edit item
            </MenuItem>
            <MenuItem
              sx={{ color: 'error.main' }}
              onClick={() => {
                if (itemMenuAnchor?.itemId) deleteItem(itemMenuAnchor.itemId);
                closeItemMenu();
              }}
            >
              Delete item
            </MenuItem>
          </Menu>
        </div>

        <div className={styles.previewBox} ref={previewRef}>
          <ContentCard className={styles.fullWidth}>
            <FieldHeader
              title="Menu Preview"
              type="h3"
              description="This is what customers see after scanning the QR. Select variants/add-ons to see transparent pricing."
            />

            <div
              className={styles.row}
              style={{ margin: '10px 0 12px', justifyContent: 'space-between', width: '100%' }}
            >
              <Typography variant="caption" className={styles.muted} style={{ fontWeight: 800 }}>
                Customer mode
              </Typography>

              {shopAcceptance === 'both' ? (
                <RadioGroup row value={customerMode} onChange={(e) => setCustomerMode(e.target.value)}>
                  <FormControlLabel value="takeaway" control={<Radio size="small" />} label="Takeaway" />
                  <FormControlLabel value="dine-in" control={<Radio size="small" />} label="Dine-in" />
                </RadioGroup>
              ) : (
                <Typography variant="caption" className={styles.muted}>
                  {shopAcceptance === 'takeaway' ? 'Takeaway only' : 'Dine-in only'}
                </Typography>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {visibleCategories.length === 0 ? (
                <Typography variant="body2" className={styles.muted}>No visible categories yet.</Typography>
              ) : (
                visibleCategories.map((cat) => {
                  const catItems = (itemsByCategory.get(cat.id) ?? []).filter((i) => {
                    if (customerMode === 'takeaway') return i.availableTakeaway;
                    return i.availableDineIn;
                  });

                  if (catItems.length === 0) return null;

                  return (
                    <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <Typography variant="subtitle1" style={{ fontWeight: 900 }}>
                        {cat.name}
                      </Typography>

                      {catItems.map((item) => {
                        const isAvailableTakeaway = !!item.availableTakeaway;
                        const isAvailableDineIn = !!item.availableDineIn;

                        const isDisabled =
                          !!item.soldOut ||
                          (customerMode === 'takeaway' ? !isAvailableTakeaway : !isAvailableDineIn);

                        const baseForFees = computeBaseForFees({ item, fulfilmentMode: customerMode });
                        const displayedTotal = baseForFees;

                        return (
                          <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div className={styles.itemRow} style={{ padding: 10 }}>
                              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                {item.photo?.url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img className={styles.thumb} src={item.photo.url} alt={item.name} />
                                ) : (
                                  <div className={styles.thumb} />
                                )}
                                <div>
                                  <Typography style={{ fontWeight: 900, lineHeight: 1.2 }}>{item.name}</Typography>
                                  <Typography variant="caption" className={styles.muted}>
                                    {customerMode === 'takeaway' ? (
                                      isAvailableTakeaway ? <>Takeaway: {formatMoney(displayedTotal)}</> : null
                                    ) : (
                                      isAvailableDineIn ? <>Dine-in: {formatMoney(displayedTotal)}</> : null
                                    )}
                                  </Typography>
                                </div>
                              </div>
                              <div className={styles.row} style={{ gap: 10 }}>
                                {item.featured ? <span className={styles.recommendedBadge}>Recommended</span> : null}
                                {item.soldOut ? <span className={styles.soldOutBadge}>Sold out</span> : null}
                                {(previewCartQtyByItemId[item.id] ?? 0) > 0 ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      disabled={(previewCartQtyByItemId[item.id] ?? 0) === 0}
                                      onClick={() => {
                                        const qty = previewCartQtyByItemId[item.id] ?? 0;
                                        if (qty >= 2) {
                                          openCartDeletePopup(item.id);
                                          return;
                                        }
                                        removeOneCartItemByItemId(item.id);
                                      }}
                                      style={{ minWidth: 28, padding: '2px 6px' }}
                                    >
                                      −
                                    </Button>
                                    <Typography variant="body2" style={{ minWidth: 18, textAlign: 'center', fontWeight: 800 }}>
                                      {previewCartQtyByItemId[item.id] ?? 0}
                                    </Typography>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      disabled={isDisabled}
                                      onClick={() => openPreviewAdd(item)}
                                      style={{ minWidth: 28, padding: '2px 6px' }}
                                    >
                                      +
                                    </Button>
                                  </div>
                                ) : (
                                  <IconButton
                                    size="small"
                                    disabled={isDisabled}
                                    onClick={() => openPreviewAdd(item)}
                                    title="Add"
                                  >
                                    <AddCircleOutlineRoundedIcon />
                                  </IconButton>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </ContentCard>
        </div>
      </div>

      <Dialog open={isPreviewFullscreenOpen} onClose={closePreviewFullscreen} fullScreen>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className={styles.row} style={{ justifyContent: 'space-between' }}>
            <Typography variant="h6" style={{ fontWeight: 900 }}>Menu Preview</Typography>
            <IconButton size="small" onClick={closePreviewFullscreen}>×</IconButton>
          </div>

          {/* reuse the same preview UI */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <ContentCard className={styles.fullWidth}>
              <FieldHeader
                title="Menu Preview"
                type="h3"
                description="This is what customers see after scanning the QR. Select variants/add-ons to see transparent pricing."
              />

              <div
                className={styles.row}
                style={{ margin: '10px 0 12px', justifyContent: 'space-between', width: '100%' }}
              >
                <Typography variant="caption" className={styles.muted} style={{ fontWeight: 800 }}>
                  Customer mode
                </Typography>

                {shopAcceptance === 'both' ? (
                  <RadioGroup row value={customerMode} onChange={(e) => setCustomerMode(e.target.value)}>
                    <FormControlLabel value="takeaway" control={<Radio size="small" />} label="Takeaway" />
                    <FormControlLabel value="dine-in" control={<Radio size="small" />} label="Dine-in" />
                  </RadioGroup>
                ) : (
                  <Typography variant="caption" className={styles.muted}>
                    {shopAcceptance === 'takeaway' ? 'Takeaway only' : 'Dine-in only'}
                  </Typography>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {visibleCategories.length === 0 ? (
                  <Typography variant="body2" className={styles.muted}>No visible categories yet.</Typography>
                ) : (
                  visibleCategories.map((cat) => {
                    const catItems = (itemsByCategory.get(cat.id) ?? []).filter((i) => {
                      if (customerMode === 'takeaway') return i.availableTakeaway;
                      return i.availableDineIn;
                    });

                    if (catItems.length === 0) return null;

                    return (
                      <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <Typography variant="subtitle1" style={{ fontWeight: 900 }}>
                          {cat.name}
                        </Typography>

                        {catItems.map((item) => {
                          const isAvailableTakeaway = !!item.availableTakeaway;
                          const isAvailableDineIn = !!item.availableDineIn;

                          const isDisabled =
                            !!item.soldOut ||
                            (customerMode === 'takeaway' ? !isAvailableTakeaway : !isAvailableDineIn);

                          const baseForFees = computeBaseForFees({ item, fulfilmentMode: customerMode });
                          const displayedTotal = baseForFees;

                          return (
                            <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div className={styles.itemRow} style={{ padding: 10 }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                  {item.photo?.url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img className={styles.thumb} src={item.photo.url} alt={item.name} />
                                  ) : (
                                    <div className={styles.thumb} />
                                  )}
                                  <div>
                                    <Typography style={{ fontWeight: 900, lineHeight: 1.2 }}>{item.name}</Typography>
                                    <Typography variant="caption" className={styles.muted}>
                                      {customerMode === 'takeaway' ? (
                                        isAvailableTakeaway ? <>Takeaway: {formatMoney(displayedTotal)}</> : null
                                      ) : (
                                        isAvailableDineIn ? <>Dine-in: {formatMoney(displayedTotal)}</> : null
                                      )}
                                    </Typography>
                                  </div>
                                </div>
                                <div className={styles.row} style={{ gap: 10 }}>
                                  {item.featured ? <span className={styles.recommendedBadge}>Recommended</span> : null}
                                  {item.soldOut ? <span className={styles.soldOutBadge}>Sold out</span> : null}
                                  {(previewCartQtyByItemId[item.id] ?? 0) > 0 ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        disabled={(previewCartQtyByItemId[item.id] ?? 0) === 0}
                                        onClick={() => {
                                          const qty = previewCartQtyByItemId[item.id] ?? 0;
                                          if (qty >= 2) {
                                            openCartDeletePopup(item.id);
                                            return;
                                          }
                                          removeOneCartItemByItemId(item.id);
                                        }}
                                        style={{ minWidth: 28, padding: '2px 6px' }}
                                      >
                                        −
                                      </Button>
                                      <Typography variant="body2" style={{ minWidth: 18, textAlign: 'center', fontWeight: 800 }}>
                                        {previewCartQtyByItemId[item.id] ?? 0}
                                      </Typography>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        disabled={isDisabled}
                                        onClick={() => openPreviewAdd(item)}
                                        style={{ minWidth: 28, padding: '2px 6px' }}
                                      >
                                        +
                                      </Button>
                                    </div>
                                  ) : (
                                    <IconButton
                                      size="small"
                                      disabled={isDisabled}
                                      onClick={() => openPreviewAdd(item)}
                                      title="Add"
                                    >
                                      <AddCircleOutlineRoundedIcon />
                                    </IconButton>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            </ContentCard>
          </div>
        </div>
      </Dialog>

      <DialogPopup
        title="Cannot delete category"
        isOpen={!!blockedDeleteCategoryName}
        setIsOpen={(open) => { if (!open) setBlockedDeleteCategoryName(null); }}
        actionTitle="OK"
        onSubmit={(e) => { e.preventDefault(); setBlockedDeleteCategoryName(null); }}
      >
        <div style={{ padding: '16px 24px' }}>
          <Typography variant="body1">
            <strong>&ldquo;{blockedDeleteCategoryName}&rdquo;</strong> is still assigned to one or more items.
            Remove the category from all items before deleting it.
          </Typography>
        </div>
      </DialogPopup>

      <Dialog
        open={isCartDeleteOpen}
        onClose={() => {
          setIsCartDeleteOpen(false);
          setCartDeleteTargetItemId(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className={styles.row} style={{ justifyContent: 'space-between' }}>
            <Typography variant="h6" style={{ fontWeight: 900 }}>Delete from cart</Typography>
            <IconButton
              size="small"
              onClick={() => {
                setIsCartDeleteOpen(false);
                setCartDeleteTargetItemId(null);
              }}
            >
              ×
            </IconButton>
          </div>

          {cartItems.length === 0 ? (
            <Typography variant="body2" className={styles.muted}>Cart is empty.</Typography>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflow: 'auto' }}>
              {cartItems
                .filter((ci) => (cartDeleteTargetItemId ? ci.itemId === cartDeleteTargetItemId : false))
                .map((ci, idx) => {
                const item = items.find((x) => x.id === ci.itemId);
                const selections = ci.selections ?? {};
                const selectionParts = (item?.optionGroups ?? []).flatMap((g) => {
                  const gSel = selections[g.id] ?? {};
                  const picked = Object.entries(gSel).filter(([, q]) => q > 0);
                  if (!picked.length) return [];
                  const names = picked
                    .map(([optId, q]) => {
                      const opt = (g.options ?? []).find((o) => o.id === optId);
                      if (!opt) return null;
                      return q > 1 ? `${opt.name} x${q}` : opt.name;
                    })
                    .filter(Boolean);
                  return names.length ? [`${g.name}: ${names.join(', ')}`] : [];
                });

                return (
                  <div key={ci.id} className={styles.itemRow} style={{ padding: '8px 10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <Typography variant="body2" style={{ fontWeight: 800 }}>
                        {idx + 1}. {ci.itemName} - {formatMoney(ci.pricingTotal ?? 0)}
                      </Typography>
                      {selectionParts.length ? (
                        <Typography variant="caption" className={styles.muted}>
                          {selectionParts.join(' · ')}
                        </Typography>
                      ) : null}
                    </div>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setCartItems((prev) => prev.filter((x) => x.id !== ci.id));
                      }}
                      title="Delete this item"
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Dialog>

      <DialogPopup
        title={selectedItem ? `Add ${selectedItem.name}` : 'Add item'}
        isOpen={isPreviewAddOpen}
        setIsOpen={setIsPreviewAddOpen}
        actionTitle="Add"
        actionDisabled={!selectedItem || !canOrderSelectedItem || !isPreviewSelectionValid}
        onSubmit={(e) => {
          e.preventDefault();
          if (!selectedItem || !previewPricing) return;
          console.log('[MenuBuilder][Preview] add item', {
            itemId: selectedItem.id,
            itemName: selectedItem.name,
            mode: customerMode,
            selections: selectedGroupOptionQtys,
            pricing: previewPricing,
          });
          setCartItems((prev) => [
            ...prev,
            {
              id: makeId(),
              itemId: selectedItem.id,
              itemName: selectedItem.name,
              mode: customerMode,
              selections: JSON.parse(JSON.stringify(selectedGroupOptionQtys ?? {})),
              pricingTotal: previewPricing.total,
            },
          ]);
          closePreviewAdd();
        }}
        maxWidth="sm"
      >
        <div style={{ padding: '12px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {selectedItem ? (
            <>
              {(selectedItem.optionGroups ?? []).length ? (
                (selectedItem.optionGroups ?? []).map((g) => {
                  const pick = normalizeNumber(g.pick ?? 0);
                  const required = !!g.required;
                  const gSel = selectedGroupOptionQtys[g.id] ?? {};
                  const selectedCount = Object.values(gSel).reduce((s, q) => s + (q > 0 ? 1 : 0), 0);
                  const canSelectMore = pick === 0 || selectedCount < pick;

                  const header = required
                    ? `${g.name} (Pick ${pick || 1}) MUST`
                    : `${g.name} (Optional${pick > 0 ? `, Max: ${pick}` : ''})`;

                  return (
                    <div key={g.id}>
                      <Typography variant="caption" className={styles.muted} style={{ fontWeight: 900 }}>
                        {header}
                      </Typography>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                        {(g.options ?? []).map((o) => {
                          const qty = gSel[o.id] ?? 0;
                          const maxQty = Math.max(1, normalizeNumber(o.maxQty ?? 1));

                          const isMust = required && (pick > 0 || required);
                          if (isMust && (pick || 1) > 0) {
                            const checked = qty > 0;
                            const disableCheck = !checked && !canSelectMore;
                            return (
                              <FormControlLabel
                                key={o.id}
                                control={
                                  <Checkbox
                                    checked={checked}
                                    disabled={disableCheck}
                                    onChange={(e2) => {
                                      setSelectedGroupOptionQtys((prev) => {
                                        const prevG = prev[g.id] ?? {};
                                        const nextG = { ...prevG };
                                        if (e2.target.checked) nextG[o.id] = 1;
                                        else delete nextG[o.id];

                                        const requiredPick = pick > 0 ? pick : 1;
                                        const ids = Object.keys(nextG);
                                        if (requiredPick > 0 && ids.length > requiredPick) {
                                          const toRemove = ids.slice(requiredPick);
                                          for (const rid of toRemove) delete nextG[rid];
                                        }
                                        return { ...prev, [g.id]: nextG };
                                      });
                                    }}
                                  />
                                }
                                label={
                                  <span>
                                    {o.name}
                                    {o.additionalPrice ? ` (+${formatMoney(o.additionalPrice)})` : ''}
                                  </span>
                                }
                              />
                            );
                          }

                          const canIncrease = qty < maxQty && (pick === 0 || selectedCount < pick || qty > 0);
                          return (
                            <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <span style={{ flex: 1 }}>
                                {o.name}
                                {o.additionalPrice ? ` (+${formatMoney(o.additionalPrice)} each` : ''}
                                {o.additionalPrice && maxQty > 1 ? `, Max: ${maxQty})` : o.additionalPrice ? ')' : ''}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  disabled={qty === 0}
                                  onClick={() => setSelectedGroupOptionQtys((prev) => {
                                    const prevG = prev[g.id] ?? {};
                                    const nextQty = Math.max(0, (prevG[o.id] ?? 0) - 1);
                                    const nextG = { ...prevG };
                                    if (nextQty === 0) delete nextG[o.id];
                                    else nextG[o.id] = nextQty;
                                    return { ...prev, [g.id]: nextG };
                                  })}
                                  style={{ minWidth: 28, padding: '2px 6px' }}
                                >−</Button>
                                <Typography variant="body2" style={{ minWidth: 20, textAlign: 'center', fontWeight: 700 }}>{qty}</Typography>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  disabled={!canIncrease || (qty === 0 && !canSelectMore)}
                                  onClick={() => setSelectedGroupOptionQtys((prev) => {
                                    const prevG = prev[g.id] ?? {};
                                    const nextQty = (prevG[o.id] ?? 0) + 1;
                                    const nextG = { ...prevG, [o.id]: nextQty };
                                    return { ...prev, [g.id]: nextG };
                                  })}
                                  style={{ minWidth: 28, padding: '2px 6px' }}
                                >+</Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <Typography variant="body2" className={styles.muted}>
                  No options for this item.
                </Typography>
              )}

              {previewPricing ? <div>{renderPricingBreakdown(previewPricing, customerMode)}</div> : null}

              {!isPreviewSelectionValid ? (
                <Typography variant="caption" style={{ color: '#d32f2f' }}>
                  Please complete all MUST selections.
                </Typography>
              ) : null}
            </>
          ) : (
            <Typography variant="body2" className={styles.muted}>
              Select an item to add.
            </Typography>
          )}
        </div>
      </DialogPopup>

      <DialogPopup
        title={itemEditor?.id ? 'Edit Item' : 'Add Item'}
        isOpen={isItemEditorOpen}
        setIsOpen={setIsItemEditorOpen}
        actionTitle="Save"
        actionDisabled={!itemEditor?.name?.trim() || !itemEditor?.categoryIds?.length}
        onSubmit={handleItemEditorSubmit}
        maxWidth="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 24px' }}>
          <FieldHeader title="Item details" type="h4" description="Name, description, and base pricing." />

          <div>
            <Typography variant="caption" className={styles.muted} style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}>
              Categories <span style={{ color: '#d32f2f' }}>*</span>
            </Typography>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 16px' }}>
              {categories.map((c) => {
                const checked = (itemEditor.categoryIds ?? []).includes(c.id);
                return (
                  <FormControlLabel
                    key={c.id}
                    label={c.name}
                    control={
                      <Checkbox
                        size="small"
                        checked={checked}
                        onChange={(e) => {
                          const prev = itemEditor.categoryIds ?? [];
                          setItemEditorField({
                            categoryIds: e.target.checked
                              ? [...prev, c.id]
                              : prev.filter((id) => id !== c.id),
                          });
                        }}
                      />
                    }
                  />
                );
              })}
            </div>
            {!(itemEditor.categoryIds ?? []).length && (
              <Typography variant="caption" style={{ color: '#d32f2f' }}>
                Select at least one category.
              </Typography>
            )}
          </div>

          <TextField
            label="Name"
            fullWidth
            size="small"
            value={itemEditor.name}
            onChange={(e) => setItemEditorField({ name: e.target.value })}
          />

          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            size="small"
            value={itemEditor.description}
            onChange={(e) => setItemEditorField({ description: e.target.value })}
          />

          <div className={styles.row} style={{ gap: 16 }}>
            {shopAcceptance !== 'dine-in' && (
              <TextField
                type="number"
                label="Takeaway Price (SGD $)"
                fullWidth
                size="small"
                value={itemEditor.takeawayBasePrice}
                onChange={(e) => setItemEditorField({ takeawayBasePrice: normalizeNumber(e.target.value) })}
                inputProps={{ min: 0, step: 0.01 }}
              />
            )}
            {shopAcceptance !== 'takeaway' && (
              <TextField
                type="number"
                label="Dine-in Price (SGD $)"
                fullWidth
                size="small"
                value={itemEditor.dineInPrice}
                onChange={(e) => setItemEditorField({ dineInPrice: normalizeNumber(e.target.value) })}
                inputProps={{ min: 0, step: 0.01 }}
              />
            )}
          </div>

          <div className={styles.dividerLine} />

          <FieldHeader title="Item image (Optional)" type="h4" description="Upload a photo for this menu item." />
          <DragDropImageUploader
            images={editorPhotoImages}
            setImages={setEditorPhotoImages}
            noOfImages={1}
            isMultiple={false}
            resetSaving={() => {}}
            width={240}
            height={140}
            imageClassName={styles.fullWidth}
            disabled={false}
          />

          <div className={styles.dividerLine} />

          <FieldHeader title="Toggles" type="h4" />

          <div className={styles.row} style={{ gap: 8, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={<Switch checked={!!itemEditor.soldOut} onChange={(e) => setItemEditorField({ soldOut: e.target.checked })} />}
              label="Sold out"
            />
            <FormControlLabel
              control={<Switch checked={!!itemEditor.featured} onChange={(e) => setItemEditorField({ featured: e.target.checked })} />}
              label="Featured"
            />
            <FormControlLabel
              control={<Switch checked={!!itemEditor.availableTakeaway} onChange={(e) => setItemEditorField({ availableTakeaway: e.target.checked })} />}
              label="Takeaway"
            />
            <FormControlLabel
              control={<Switch checked={!!itemEditor.availableDineIn} onChange={(e) => setItemEditorField({ availableDineIn: e.target.checked })} />}
              label="Dine-in"
            />
          </div>

          <div className={styles.dividerLine} />

          <FieldHeader
            title="Option Groups"
            type="h4"
            description="Create groups like “Combo”, “Drink”, or “Add Ons (Optional)”."
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(itemEditor.optionGroups ?? []).map((g) => (
              <div key={g.id} style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: 12 }}>
                <div className={styles.row} style={{ gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
                  <TextField
                    label="Group name"
                    size="small"
                    value={g.name ?? ''}
                    onChange={(e) => {
                      const name = e.target.value;
                      setItemEditor((prev) => ({
                        ...prev,
                        optionGroups: (prev.optionGroups ?? []).map((x) => (x.id === g.id ? { ...x, name } : x)),
                      }));
                    }}
                    style={{ flex: 1, minWidth: 220, marginBottom: 24 }}
                  />
                  <TextField
                    type="number"
                    label="Pick"
                    size="small"
                    value={g.pick ?? 0}
                    onChange={(e) => {
                      const pick = Math.max(0, normalizeNumber(e.target.value));
                      setItemEditor((prev) => ({
                        ...prev,
                        optionGroups: (prev.optionGroups ?? []).map((x) => (x.id === g.id ? { ...x, pick } : x)),
                      }));
                    }}
                    inputProps={{ min: 0, step: 1 }}
                    style={{ width: 110 }}
                    helperText="0 = unlimited"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!g.required}
                        onChange={(e) => {
                          const required = e.target.checked;
                          setItemEditor((prev) => ({
                            ...prev,
                            optionGroups: (prev.optionGroups ?? []).map((x) => (x.id === g.id ? { ...x, required } : x)),
                          }));
                        }}
                      />
                    }
                    label="MUST"
                    style={{ marginBottom: 24 }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                  {(g.options ?? []).map((o) => (
                    <div key={o.id} className={styles.row} style={{ gap: 10, flexWrap: 'nowrap', alignItems: 'center' }}>
                      <TextField
                        label="Option name"
                        size="small"
                        value={o.name ?? ''}
                        onChange={(e) => {
                          const name = e.target.value;
                          setItemEditor((prev) => ({
                            ...prev,
                            optionGroups: (prev.optionGroups ?? []).map((x) => (
                              x.id === g.id
                                ? { ...x, options: (x.options ?? []).map((y) => (y.id === o.id ? { ...y, name } : y)) }
                                : x
                            )),
                          }));
                        }}
                        style={{ flex: 1, minWidth: 160 }}
                      />
                      <TextField
                        type="number"
                        label="Additional Price (SGD $)"
                        size="small"
                        value={o.additionalPrice ?? 0}
                        onChange={(e) => {
                          const additionalPrice = normalizeNumber(e.target.value);
                          setItemEditor((prev) => ({
                            ...prev,
                            optionGroups: (prev.optionGroups ?? []).map((x) => (
                              x.id === g.id
                                ? { ...x, options: (x.options ?? []).map((y) => (y.id === o.id ? { ...y, additionalPrice } : y)) }
                                : x
                            )),
                          }));
                        }}
                        inputProps={{ min: 0, step: 0.01 }}
                        style={{ width: 158 }}
                      />
                      <TextField
                        type="number"
                        label="Max servings"
                        size="small"
                        value={o.maxQty ?? 1}
                        onChange={(e) => {
                          const maxQty = Math.max(1, normalizeNumber(e.target.value));
                          setItemEditor((prev) => ({
                            ...prev,
                            optionGroups: (prev.optionGroups ?? []).map((x) => (
                              x.id === g.id
                                ? { ...x, options: (x.options ?? []).map((y) => (y.id === o.id ? { ...y, maxQty } : y)) }
                                : x
                            )),
                          }));
                        }}
                        inputProps={{ min: 1, step: 1 }}
                        style={{ width: 98 }}
                        helperText=""
                      />
                      <Button
                        size="small"
                        variant="text"
                        color="error"
                        onClick={() => {
                          setItemEditor((prev) => ({
                            ...prev,
                            optionGroups: (prev.optionGroups ?? []).map((x) => (
                              x.id === g.id ? { ...x, options: (x.options ?? []).filter((y) => y.id !== o.id) } : x
                            )),
                          }));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}

                  <div className={styles.row} style={{ justifyContent: 'space-between' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setItemEditor((prev) => ({
                          ...prev,
                          optionGroups: (prev.optionGroups ?? []).map((x) => (
                            x.id === g.id
                              ? { ...x, options: [...(x.options ?? []), { id: makeId(), name: '', additionalPrice: 0, maxQty: 1 }] }
                              : x
                          )),
                        }));
                      }}
                    >
                      Add option
                    </Button>

                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setItemEditor((prev) => ({
                          ...prev,
                          optionGroups: (prev.optionGroups ?? []).filter((x) => x.id !== g.id),
                        }));
                      }}
                      title="Remove group"
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </div>
                </div>
              </div>
            ))}

            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setItemEditor((prev) => ({
                  ...prev,
                  optionGroups: [
                    ...(prev.optionGroups ?? []),
                    { id: makeId(), name: '', required: false, pick: 0, options: [] },
                  ],
                }));
              }}
            >
              Add option group
            </Button>
          </div>
        </div>
      </DialogPopup>
    </div>
  );
}

