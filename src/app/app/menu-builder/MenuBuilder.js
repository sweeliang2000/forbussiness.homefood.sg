'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './MenuBuilder.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import { Button, Checkbox, FormControlLabel, MenuItem, Radio, RadioGroup, Select, Switch, TextField, Typography } from '@mui/material';
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
  variantsMaxSelection: 1,
  addOnsMaxTotal: 0,
  variants: [],
  addOns: [],
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

const computeVariantDelta = ({ selectedVariantId, item }) => {
  if (!selectedVariantId) return 0;
  const v = item.variants?.find((x) => x.id === selectedVariantId);
  return normalizeNumber(v?.additionalPrice);
};

const computeAddOnDelta = ({ selectedAddOnQtys, item }) => {
  return (item.addOns ?? []).reduce((sum, a) => {
    const qty = (selectedAddOnQtys ?? {})[a.id] ?? 0;
    return sum + qty * normalizeNumber(a.additionalPrice);
  }, 0);
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
      variantsMaxSelection: 1,
      addOnsMaxTotal: 0,
      variants: [
        { id: 'v-spice-mild', name: 'Mild', additionalPrice: 0 },
        { id: 'v-spice-spicy', name: 'Spicy', additionalPrice: 1.0 },
      ],
      addOns: [
        { id: 'a-extra-sauce', name: 'Extra Sauce', additionalPrice: 0.5, maxQty: 3 },
        { id: 'a-cheese-dust', name: 'Cheese Dust', additionalPrice: 1.0, maxQty: 2 },
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
      variantsMaxSelection: 1,
      addOnsMaxTotal: 0,
      variants: [{ id: 'v-grill', name: 'Grilled', additionalPrice: 0 }],
      addOns: [{ id: 'a-salad', name: 'Side Salad', additionalPrice: 4.0, maxQty: 1 }],
    },
  ]);

  // Category creation.
  const [newCategoryName, setNewCategoryName] = useState('');
  const [draggingCategoryId, setDraggingCategoryId] = useState(null);

  // Store acceptance: whether the shop accepts takeaway, dine-in, or both.
  const [shopAcceptance, setShopAcceptance] = useState('takeaway'); // 'takeaway' | 'dine-in' | 'both'

  // Customer mode for the preview (what the merchant wants to preview).
  const [customerMode, setCustomerMode] = useState('takeaway'); // 'takeaway' | 'dine-in'

  // Preview selection state.
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [selectedAddOnQtys, setSelectedAddOnQtys] = useState({});

  const selectedItem = useMemo(() => items.find((i) => i.id === selectedItemId) ?? null, [items, selectedItemId]);

  useEffect(() => {
    // If the shop doesn't accept a mode, force the preview mode to the accepted one.
    if (shopAcceptance === 'takeaway') setCustomerMode('takeaway');
    if (shopAcceptance === 'dine-in') setCustomerMode('dine-in');
  }, [shopAcceptance]);

  useEffect(() => {
    // When switching preview mode, clear the selection so the preview always matches
    // "what customer can order".
    setSelectedItemId(null);
    setSelectedVariantId(null);
    setSelectedAddOnQtys({});
  }, [customerMode]);

  useEffect(() => {
    if (!selectedItemId) return;
    const stillExists = items.some((i) => i.id === selectedItemId);
    if (!stillExists) {
      setSelectedItemId(null);
      setSelectedVariantId(null);
      setSelectedAddOnQtys({});
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
      variantsMaxSelection: Math.max(1, normalizeNumber(itemEditor.variantsMaxSelection ?? 1)),
      addOnsMaxTotal: Math.max(0, normalizeNumber(itemEditor.addOnsMaxTotal ?? 0)),
      variants: (itemEditor.variants ?? []).map((v) => ({
        id: v.id ?? makeId(),
        name: v.name ?? '',
        additionalPrice: normalizeNumber(v.additionalPrice),
      })),
      addOns: (itemEditor.addOns ?? []).map((a) => ({
        id: a.id ?? makeId(),
        name: a.name ?? '',
        additionalPrice: normalizeNumber(a.additionalPrice),
        maxQty: Math.max(1, normalizeNumber(a.maxQty ?? 1)),
      })),
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
        variantsMaxSelection: i.variantsMaxSelection ?? 1,
        addOnsMaxTotal: i.addOnsMaxTotal ?? 0,
        variants: (i.variants ?? []).map((v) => ({
          id: v.id,
          name: v.name,
          additionalPrice: normalizeNumber(v.additionalPrice),
        })),
        addOns: (i.addOns ?? []).map((a) => ({
          id: a.id,
          name: a.name,
          additionalPrice: normalizeNumber(a.additionalPrice),
          maxQty: a.maxQty ?? 1,
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
      const variantDelta = computeVariantDelta({ selectedVariantId, item: selectedItem });
      const addOnDelta = computeAddOnDelta({ selectedAddOnQtys, item: selectedItem });

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
        // Global: Service then GST sequentially.
        const serviceEnabled = !!storePricing.serviceEnabled;
        const gstEnabled = !!storePricing.gstEnabled;

        const servicePercent = normalizeNumber(storePricing.servicePercent);
        const gstPercent = normalizeNumber(storePricing.gstPercent);

        const serviceAmount = serviceEnabled ? baseForFees * (servicePercent / 100) : 0;
        const intermediate = baseForFees + serviceAmount;
        const gstAmount = gstEnabled ? intermediate * (gstPercent / 100) : 0;
        fee = serviceAmount + gstAmount;
        feeBreakdown = {
          type: PRICING_OVERRIDE_TYPES.GLOBAL,
          serviceEnabled,
          servicePercent,
          serviceAmount,
          gstEnabled,
          gstPercent,
          gstAmount,
        };
      }

      const dineInDelta = mode === 'dine-in'
        ? normalizeNumber(selectedItem.dineInPrice) - normalizeNumber(selectedItem.takeawayBasePrice)
        : 0;

      const total = baseForFees + fee + variantDelta + addOnDelta;

      return {
        baseForFees,
        dineInDelta,
        fee,
        feeBreakdown,
        variantDelta,
        addOnDelta,
        total,
      };
    };

    return computePreviewPricingForMode(customerMode);
  }, [selectedItem, selectedVariantId, selectedAddOnQtys, customerMode, storePricing]);

  const canOrderSelectedItem = useMemo(() => {
    if (!selectedItem) return false;
    if (selectedItem.soldOut) return false;

    if (customerMode === 'takeaway') return selectedItem.availableTakeaway;
    if (customerMode === 'dine-in') return selectedItem.availableDineIn;
    return selectedItem.availableTakeaway || selectedItem.availableDineIn;
  }, [selectedItem, customerMode]);

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

        {pricing.variantDelta ? (
          <div className={styles.breakdownLine}>
            <span className={styles.muted}>Variant</span>
            <span style={{ fontWeight: 800 }}>+{formatMoney(pricing.variantDelta)}</span>
          </div>
        ) : null}

        {pricing.addOnDelta ? (
          <div className={styles.breakdownLine}>
            <span className={styles.muted}>Add-ons</span>
            <span style={{ fontWeight: 800 }}>+{formatMoney(pricing.addOnDelta)}</span>
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
        <div className={styles.stickyHeaderInner}>
          <div>
            <FieldHeader
              title="Menu Builder"
              type="h3"
              description="Set up categories, items, and pricing rules. All data stays in local state for this mock."
            />
          </div>
          <div className={styles.stickyHeaderActions}>
            <Button variant="contained" onClick={handlePublishMenu}>
              Save Menu / Publish
            </Button>
          </div>
        </div>
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
                  <Switch
                    checked={cat.isVisible}
                    onChange={(e) => setCategories((prev) => prev.map((x) => (x.id === cat.id ? { ...x, isVisible: e.target.checked } : x)))}
                    size="small"
                  />
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
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <Typography variant="caption" className={styles.muted}>Featured</Typography>
                                <Switch checked={!!item.featured} onChange={(e) => handleQuickFeatured(item.id, e.target.checked)} size="small" />
                              </div>
                              <Select
                                size="small"
                                value={item.availableTakeaway && item.availableDineIn ? 'both' : item.availableTakeaway ? 'takeaway' : item.availableDineIn ? 'dine-in' : 'none'}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v === 'both') handleQuickAvailability(item.id, { availableTakeaway: true, availableDineIn: true });
                                  else if (v === 'takeaway') handleQuickAvailability(item.id, { availableTakeaway: true, availableDineIn: false });
                                  else if (v === 'dine-in') handleQuickAvailability(item.id, { availableTakeaway: false, availableDineIn: true });
                                  else handleQuickAvailability(item.id, { availableTakeaway: false, availableDineIn: false });
                                }}
                              >
                                <MenuItem value="both">Takeaway + Dine-in</MenuItem>
                                <MenuItem value="takeaway">Takeaway</MenuItem>
                                <MenuItem value="dine-in">Dine-in</MenuItem>
                                <MenuItem value="none">Not available</MenuItem>
                              </Select>

                              <Button size="small" variant="outlined" onClick={() => openEditItemEditor(item)}>
                                Edit
                              </Button>
                              <Button size="small" variant="text" color="error" onClick={() => deleteItem(item.id)}>
                                Delete
                              </Button>
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
        </div>

        <div className={styles.previewBox}>
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
                        const isSelected = selectedItemId === item.id;

                        const baseForFees = computeBaseForFees({ item, fulfilmentMode: customerMode });
                        const displayedTotal = isSelected
                          ? previewPricing?.total ?? baseForFees
                          : baseForFees;

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
                                <Button
                                  size="small"
                                  variant={isSelected ? 'contained' : 'outlined'}
                                  disabled={isDisabled}
                                  onClick={() => {
                                    setSelectedItemId(item.id);
                                    setSelectedVariantId(item.variants?.[0]?.id ?? null);
                                    setSelectedAddOnQtys({});
                                  }}
                                >
                                  {isSelected ? 'Selected' : 'Customize'}
                                </Button>
                              </div>
                            </div>

                            {isSelected && canOrderSelectedItem ? (
                              <div>
                                {item.variants?.length ? (
                                  <div style={{ marginBottom: 10 }}>
                                    <Typography variant="caption" className={styles.muted}>
                                      Variants — pick {item.variantsMaxSelection ?? 1}
                                    </Typography>
                                    <RadioGroup
                                      value={selectedVariantId ?? ''}
                                      onChange={(e) => setSelectedVariantId(e.target.value)}
                                      style={{ flexDirection: 'column' }}
                                    >
                                      {item.variants.map((v) => (
                                        <FormControlLabel
                                          key={v.id}
                                          value={v.id}
                                          control={<Radio />}
                                          label={
                                            <span>
                                              {v.name}
                                              {v.additionalPrice ? ` (+${formatMoney(v.additionalPrice)})` : ''}
                                            </span>
                                          }
                                        />
                                      ))}
                                    </RadioGroup>
                                  </div>
                                ) : null}

                                {item.addOns?.length ? (() => {
                                  const maxTotal = item.addOnsMaxTotal ?? 0;
                                  const totalSelected = Object.values(selectedAddOnQtys).reduce((s, q) => s + q, 0);
                                  return (
                                    <div style={{ marginBottom: 10 }}>
                                      <Typography variant="caption" className={styles.muted}>
                                        Add-ons{maxTotal > 0 ? ` — max ${maxTotal} total` : ' — unlimited'}
                                        {maxTotal > 0 ? ` (${totalSelected}/${maxTotal} selected)` : ''}
                                      </Typography>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                                        {item.addOns.map((a) => {
                                          const qty = selectedAddOnQtys[a.id] ?? 0;
                                          const aMaxQty = a.maxQty ?? 1;
                                          const canIncrease = qty < aMaxQty && (maxTotal === 0 || totalSelected < maxTotal);
                                          return (
                                            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                              <span style={{ flex: 1 }}>
                                                {a.name}
                                                {a.additionalPrice ? ` (+${formatMoney(a.additionalPrice)} each)` : ''}
                                              </span>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Button
                                                  size="small"
                                                  variant="outlined"
                                                  disabled={qty === 0}
                                                  onClick={() => setSelectedAddOnQtys((prev) => ({ ...prev, [a.id]: Math.max(0, (prev[a.id] ?? 0) - 1) }))}
                                                  style={{ minWidth: 28, padding: '2px 6px' }}
                                                >−</Button>
                                                <Typography variant="body2" style={{ minWidth: 20, textAlign: 'center', fontWeight: 700 }}>{qty}</Typography>
                                                <Button
                                                  size="small"
                                                  variant="outlined"
                                                  disabled={!canIncrease}
                                                  onClick={() => setSelectedAddOnQtys((prev) => ({ ...prev, [a.id]: (prev[a.id] ?? 0) + 1 }))}
                                                  style={{ minWidth: 28, padding: '2px 6px' }}
                                                >+</Button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })() : null}

                                {previewPricing ? <div>{renderPricingBreakdown(previewPricing, customerMode)}</div> : null}
                              </div>
                            ) : isSelected ? (
                              <Typography variant="body2" className={styles.muted}>This item is not available in the current mode or is sold out.</Typography>
                            ) : null}
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

      <DialogPopup
        title={itemEditor?.id ? 'Edit Item' : 'Add Item'}
        isOpen={isItemEditorOpen}
        setIsOpen={setIsItemEditorOpen}
        actionTitle="Save"
        actionDisabled={!itemEditor?.name?.trim() || !itemEditor?.categoryIds?.length}
        onSubmit={handleItemEditorSubmit}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 24px' }}>
          <FieldHeader title="Item image" type="h4" description="Upload a photo for this menu item." />
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

          <FieldHeader title="Pricing Setup (Override)" type="h4" description="Choose whether this item uses store Service+GST, or applies a custom fee." />

          <Select
            fullWidth
            size="small"
            value={itemEditor.pricingOverrideType}
            onChange={(e) => {
              const next = e.target.value;
              setItemEditorField({ pricingOverrideType: next });
            }}
          >
            <MenuItem value={PRICING_OVERRIDE_TYPES.GLOBAL}>Global (Service then GST)</MenuItem>
            <MenuItem value={PRICING_OVERRIDE_TYPES.CUSTOM_PERCENT}>Custom % (skips store service+GST)</MenuItem>
            <MenuItem value={PRICING_OVERRIDE_TYPES.FIXED_PRICE}>Fixed price (skips store service+GST)</MenuItem>
            <MenuItem value={PRICING_OVERRIDE_TYPES.EXEMPT}>Exempt (skips service+GST)</MenuItem>
          </Select>

          {itemEditor.pricingOverrideType === PRICING_OVERRIDE_TYPES.CUSTOM_PERCENT ? (
            <TextField
              type="number"
              label="Custom %"
              fullWidth
              size="small"
              value={itemEditor.pricingOverrideCustomPercent}
              onChange={(e) => setItemEditorField({ pricingOverrideCustomPercent: normalizeNumber(e.target.value) })}
              style={{ marginTop: 10 }}
              inputProps={{ min: 0, step: 0.01 }}
            />
          ) : null}

          {itemEditor.pricingOverrideType === PRICING_OVERRIDE_TYPES.FIXED_PRICE ? (
            <TextField
              type="number"
              label="Fixed surcharge amount"
              fullWidth
              size="small"
              value={itemEditor.pricingOverrideFixedPrice}
              onChange={(e) => setItemEditorField({ pricingOverrideFixedPrice: normalizeNumber(e.target.value) })}
              style={{ marginTop: 10 }}
              inputProps={{ min: 0, step: 0.01 }}
            />
          ) : null}

          <div className={styles.dividerLine} />

          <FieldHeader title="Variants" type="h4" description="Single-select options (e.g. Cup vs Cone). Each option can have an additional price." />

          <div className={styles.row} style={{ gap: 16, alignItems: 'center' }}>
            <TextField
              type="number"
              label="Max selections"
              size="small"
              value={itemEditor.variantsMaxSelection ?? 1}
              onChange={(e) => setItemEditorField({ variantsMaxSelection: Math.max(1, normalizeNumber(e.target.value)) })}
              inputProps={{ min: 1, step: 1 }}
              style={{ width: 140 }}
              helperText="Default: 1"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(itemEditor.variants ?? []).map((v) => (
              <div key={v.id} className={styles.row} style={{ gap: 10 }}>
                <TextField
                  label="Option name"
                  size="small"
                  value={v.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setItemEditor((prev) => ({
                      ...prev,
                      variants: (prev.variants ?? []).map((x) => (x.id === v.id ? { ...x, name } : x)),
                    }));
                  }}
                  style={{ flex: 1, minWidth: 160 }}
                />
                <TextField
                  type="number"
                  label="Additional Price (SGD $)"
                  size="small"
                  value={v.additionalPrice ?? 0}
                  onChange={(e) => {
                    const additionalPrice = normalizeNumber(e.target.value);
                    setItemEditor((prev) => ({
                      ...prev,
                      variants: (prev.variants ?? []).map((x) => (x.id === v.id ? { ...x, additionalPrice } : x)),
                    }));
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  style={{ width: 170 }}
                />
                <Button
                  size="small"
                  variant="text"
                  color="error"
                  onClick={() => {
                    setItemEditor((prev) => ({ ...prev, variants: (prev.variants ?? []).filter((x) => x.id !== v.id) }));
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setItemEditor((prev) => ({
                  ...prev,
                  variants: [...(prev.variants ?? []), { id: makeId(), name: '', additionalPrice: 0 }],
                }));
              }}
            >
              Add Option
            </Button>
          </div>

          <div className={styles.dividerLine} />

          <FieldHeader title="Add-ons" type="h4" description="Optional extras customers can add. Each add-on can have a price and a max serving quantity." />

          <div className={styles.row} style={{ gap: 16, alignItems: 'center' }}>
            <TextField
              type="number"
              label="Max total add-ons"
              size="small"
              value={itemEditor.addOnsMaxTotal ?? 0}
              onChange={(e) => setItemEditorField({ addOnsMaxTotal: Math.max(0, normalizeNumber(e.target.value)) })}
              inputProps={{ min: 0, step: 1 }}
              style={{ width: 160 }}
              helperText="0 = unlimited"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(itemEditor.addOns ?? []).map((a) => (
              <div key={a.id} className={styles.row} style={{ gap: 10, flexWrap: 'wrap' }}>
                <TextField
                  label="Add-on name"
                  size="small"
                  value={a.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setItemEditor((prev) => ({
                      ...prev,
                      addOns: (prev.addOns ?? []).map((x) => (x.id === a.id ? { ...x, name } : x)),
                    }));
                  }}
                  style={{ flex: 1, minWidth: 150 }}
                />
                <TextField
                  type="number"
                  label="Additional Price (SGD $)"
                  size="small"
                  value={a.additionalPrice ?? 0}
                  onChange={(e) => {
                    const additionalPrice = normalizeNumber(e.target.value);
                    setItemEditor((prev) => ({
                      ...prev,
                      addOns: (prev.addOns ?? []).map((x) => (x.id === a.id ? { ...x, additionalPrice } : x)),
                    }));
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  style={{ width: 170 }}
                />
                <TextField
                  type="number"
                  label="Max servings"
                  size="small"
                  value={a.maxQty ?? 1}
                  onChange={(e) => {
                    const maxQty = Math.max(1, normalizeNumber(e.target.value));
                    setItemEditor((prev) => ({
                      ...prev,
                      addOns: (prev.addOns ?? []).map((x) => (x.id === a.id ? { ...x, maxQty } : x)),
                    }));
                  }}
                  inputProps={{ min: 1, step: 1 }}
                  style={{ width: 110 }}
                  helperText="Per customer"
                />
                <Button
                  size="small"
                  variant="text"
                  color="error"
                  onClick={() => {
                    setItemEditor((prev) => ({ ...prev, addOns: (prev.addOns ?? []).filter((x) => x.id !== a.id) }));
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setItemEditor((prev) => ({
                  ...prev,
                  addOns: [...(prev.addOns ?? []), { id: makeId(), name: '', additionalPrice: 0, maxQty: 1 }],
                }));
              }}
            >
              Add Add-on
            </Button>
          </div>
        </div>
      </DialogPopup>
    </div>
  );
}

