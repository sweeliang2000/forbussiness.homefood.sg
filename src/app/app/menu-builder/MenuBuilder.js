'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './MenuBuilder.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import { Button, Checkbox, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, FormControlLabel, IconButton, Menu, MenuItem, Radio, RadioGroup, Select, Switch, TextField, Typography } from '@mui/material';
import Shimmer from '@/components/Shimmer/Shimmer';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import DialogPopup from '@/components/DialogPopup/DialogPopup';
import DragDropImageUploader from '@/components/Form Components/DragDropImageUploader/DragDropImageUploader';
import { Alert } from '@mui/material';
import apiClient from '@/utility/api';
import { MENU, RELEASE_STATUS, PUBLISH_MENU_UPDATE, ORDERING_SETTINGS, MENU_SOLD_OUT } from '@/utility/apiPaths';
import { CAP } from '@/lib/permissions';
import usePermissions from '@/hooks/usePermissions';
import PermissionGate from '@/components/PermissionGate/PermissionGate';
import { FaCheck } from 'react-icons/fa';
import Link from 'next/link';

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

// The cheapest add-on a customer is forced to pay: for each REQUIRED group (min ≥ 1),
// the sum of the `min` cheapest option prices. Optional groups add nothing. Used to
// compute an item's "from" price. `groups` are resolved groups with min + options.
const minRequiredAddOn = (groups) => (groups ?? []).reduce((sum, g) => {
  const min = normalizeNumber(g?.min ?? (g?.required ? 1 : 0));
  if (min <= 0) return sum;
  const prices = (g?.options ?? []).map((o) => normalizeNumber(o.additionalPrice)).sort((a, b) => a - b);
  let add = 0;
  for (let k = 0; k < Math.min(min, prices.length); k++) add += prices[k];
  return sum + add;
}, 0);

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
  prepTimeMinutes: 0,
  soldOut: false,
  soldOutPreorder: false,
  featured: false,
  availableTakeaway: true,
  availableDineIn: true,
  pricingOverrideType: PRICING_OVERRIDE_TYPES.GLOBAL,
  pricingOverrideCustomPercent: 0,
  pricingOverrideFixedPrice: 0,
  optionGroupIds: [],
});

// A reusable option group lives at shop level and is attached to items by id.
// `referenceName` is internal (merchant-only); customers only ever see `name`.
const getDefaultGroup = () => ({
  id: null,
  referenceName: '',
  name: '',
  required: false,
  min: 0,
  pick: 0,
  options: [],
});

// What a group is called in the merchant's own lists. The internal reference
// is optional, so a group without one is listed under the name customers see —
// never as a blank row.
const groupLabel = (g) => ((g?.referenceName ?? '').trim() || (g?.name ?? '').trim());

// Signature of the customer-affecting parts of a group — used to detect whether a
// group edit actually changes anything items would see. referenceName is excluded
// on purpose: renaming the internal label shouldn't trigger the shared-edit warning.
const groupComparable = (g) => JSON.stringify({
  name: (g.name ?? '').trim(),
  required: !!g.required, min: normalizeNumber(g.min ?? (g.required ? 1 : 0)),
  pick: Math.max(0, normalizeNumber(g.pick ?? 0)),
  options: (g.options ?? []).map((o) => ({
    id: o.id,
    name: (o.name ?? '').trim(),
    additionalPrice: normalizeNumber(o.additionalPrice),
    maxQty: Math.max(1, normalizeNumber(o.maxQty ?? 1)),
    soldOut: !!o.soldOut, soldOutPreorder: !!o.soldOutPreorder,
  })),
});

const getItemEditorPhotoFromItem = (item) => {
  if (!item?.photo?.url) return [];
  return [{ name: item.photo.name ?? 'photo', url: item.photo.url, file: item.photo.file ?? null }];
};

const computeBaseForFees = ({ item, fulfilmentMode }) => {
  if (fulfilmentMode === 'dine-in') {
    return normalizeNumber(item.dineInPrice);
  }
  return normalizeNumber(item.takeawayBasePrice);
};

const computeOptionsDelta = ({ selectedGroupOptionQtys, groups }) => {
  const sel = selectedGroupOptionQtys ?? {};
  let sum = 0;
  for (const g of (groups ?? [])) {
    const gSel = sel[g.id] ?? {};
    for (const opt of (g.options ?? [])) {
      const qty = gSel[opt.id] ?? 0;
      sum += qty * normalizeNumber(opt.additionalPrice);
    }
  }
  return sum;
};

const buildDefaultGroupSelections = (groups) => {
  const out = {};
  for (const g of (groups ?? [])) {
    const pick = normalizeNumber(g.pick ?? 0);
    if (!g.required || pick <= 0) continue;
    const opts = (g.options ?? []).filter((o) => !o.soldOut);
    if (!opts.length) continue;
    const gSel = {};
    // Default: pick the first N available options (qty=1 each).
    for (let i = 0; i < Math.min(pick, opts.length); i += 1) {
      gSel[opts[i].id] = 1;
    }
    out[g.id] = gSel;
  }
  return out;
};

// Map an API item (snake_case availability/pricingOverride) to internal component state shape.
// Legacy embedded `optionGroups` are kept here only so they can be migrated into the
// shop-level reusable library right after load (see migrateMenuToLibrary).
const mapApiItemToState = (i) => ({
  id: i.id,
  categoryIds: i.categoryIds ?? [],
  photo: i.photo ? { name: i.photo.name, url: i.photo.url, file: null } : null,
  name: i.name ?? '',
  description: i.description ?? '',
  takeawayBasePrice: normalizeNumber(i.takeawayBasePrice),
  dineInPrice: normalizeNumber(i.dineInPrice),
  prepTimeMinutes: Math.max(0, normalizeNumber(i.prepTimeMinutes)),
  soldOut: !!i.soldOut,                 // sold out for today / immediate
  soldOutPreorder: !!i.soldOutPreorder, // sold out for pre-order
  featured: !!i.featured,
  availableTakeaway: i.availability?.takeaway ?? true,
  availableDineIn: i.availability?.dineIn ?? true,
  pricingOverrideType: i.pricingOverrideType ?? PRICING_OVERRIDE_TYPES.GLOBAL,
  pricingOverrideCustomPercent: normalizeNumber(i.pricingOverride?.customPercent),
  pricingOverrideFixedPrice: normalizeNumber(i.pricingOverride?.fixedPrice),
  optionGroupIds: Array.isArray(i.optionGroupIds) ? i.optionGroupIds : [],
  optionGroups: (i.optionGroups ?? []).map((g) => ({
    id: g.id,
    name: g.name ?? '',
    required: !!g.required, min: normalizeNumber(g.min ?? (g.required ? 1 : 0)),
    pick: normalizeNumber(g.pick ?? 0),
    options: (g.options ?? []).map((o) => ({
      id: o.id,
      name: o.name ?? '',
      additionalPrice: normalizeNumber(o.additionalPrice),
      maxQty: Math.max(1, normalizeNumber(o.maxQty ?? 1)),
      soldOut: !!o.soldOut, soldOutPreorder: !!o.soldOutPreorder,
    })),
  })),
});

const mapApiGroupToState = (g) => ({
  id: g.id,
  referenceName: g.referenceName ?? g.name ?? '',
  name: g.name ?? '',
  required: !!g.required, min: normalizeNumber(g.min ?? (g.required ? 1 : 0)),
  pick: normalizeNumber(g.pick ?? 0),
  options: (g.options ?? []).map((o) => ({
    id: o.id,
    name: o.name ?? '',
    additionalPrice: normalizeNumber(o.additionalPrice),
    maxQty: Math.max(1, normalizeNumber(o.maxQty ?? 1)),
    soldOut: !!o.soldOut, soldOutPreorder: !!o.soldOutPreorder,
  })),
});

// One-time migration: hoist legacy per-item embedded option groups into the shop-level
// reusable library. Structurally identical groups collapse into a single library entry,
// so existing duplicated groups become genuinely shared.
const migrateMenuToLibrary = (rawItems, rawLibrary) => {
  const library = [...rawLibrary];

  const signatureOf = (g) => JSON.stringify({
    name: (g.name ?? '').trim().toLowerCase(),
    required: !!g.required, min: normalizeNumber(g.min ?? (g.required ? 1 : 0)),
    pick: normalizeNumber(g.pick ?? 0),
    options: (g.options ?? []).map((o) => ({
      name: (o.name ?? '').trim().toLowerCase(),
      additionalPrice: normalizeNumber(o.additionalPrice),
      maxQty: Math.max(1, normalizeNumber(o.maxQty ?? 1)),
    })),
  });

  const signatureToId = new Map(library.map((g) => [signatureOf(g), g.id]));
  const usedReferenceNames = new Set(library.map((g) => (g.referenceName || g.name || '').toLowerCase()));

  const uniqueReferenceName = (base) => {
    const clean = (base ?? '').trim() || 'Option group';
    if (!usedReferenceNames.has(clean.toLowerCase())) {
      usedReferenceNames.add(clean.toLowerCase());
      return clean;
    }
    let n = 2;
    while (usedReferenceNames.has(`${clean} (${n})`.toLowerCase())) n += 1;
    usedReferenceNames.add(`${clean} (${n})`.toLowerCase());
    return `${clean} (${n})`;
  };

  let didMigrate = false;

  const items = rawItems.map((item) => {
    if ((item.optionGroupIds ?? []).length || !(item.optionGroups ?? []).length) return item;

    didMigrate = true;
    const ids = [];
    for (const g of item.optionGroups) {
      const sig = signatureOf(g);
      let gid = signatureToId.get(sig);
      if (!gid) {
        gid = g.id ?? makeId();
        if (library.some((x) => x.id === gid)) gid = makeId();
        library.push({
          id: gid,
          referenceName: uniqueReferenceName(g.name),
          name: g.name ?? '',
          required: !!g.required, min: normalizeNumber(g.min ?? (g.required ? 1 : 0)),
          pick: normalizeNumber(g.pick ?? 0),
          options: (g.options ?? []).map((o) => ({
            id: o.id ?? makeId(),
            name: o.name ?? '',
            additionalPrice: normalizeNumber(o.additionalPrice),
            maxQty: Math.max(1, normalizeNumber(o.maxQty ?? 1)),
            soldOut: !!o.soldOut, soldOutPreorder: !!o.soldOutPreorder,
          })),
        });
        signatureToId.set(sig, gid);
      }
      ids.push(gid);
    }
    return { ...item, optionGroupIds: ids };
  });

  return { items, library, didMigrate };
};

export default function MenuBuilder() {
  const storePricing = DEFAULT_STORE_PRICING;

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isEdit, setIsEdit] = useState(true);

  /*
    Two different permissions live on this page.

    Menu *content* — categories, option groups, items, prices — is
    Owner/Manager and goes through Save then Publish. Menu *availability* is
    everyone including Operators, and cannot go through Save, both because an
    Operator has no Publish and because "we ran out" needs to reach customers
    now. So the sold-out switch on each row writes straight through the
    terminal's endpoint, and canEditMenu locks everything else.
  */
  const { can } = usePermissions();
  const canEditMenu = can(CAP.MENU_EDIT);
  const canToggleAvailability = can(CAP.MENU_AVAILABILITY);
  const [soldOutSavingId, setSoldOutSavingId] = useState(null);

  // Locked either because the shop is in the release queue, or because this
  // role does not edit menu content. Availability is deliberately outside it.
  const canEditContent = isEdit && canEditMenu;

  const [releaseStatus, setReleaseStatus] = useState(null);

  // Categories are kept in an ordered array for drag-to-reorder.
  const [categories, setCategories] = useState([]);

  // Items are kept as a flat list with categoryId.
  const [items, setItems] = useState([]);

  // Shop-level reusable option groups. Items reference them by id (optionGroupIds).
  const [optionGroupsLibrary, setOptionGroupsLibrary] = useState([]);

  // Base minutes added on top of item make times when estimating an order's
  // completion time (POS/terminal). Default 15.
  const [prepBufferMinutes, setPrepBufferMinutes] = useState(15);

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
      markMenuChanged();
    }
  };

  // Store acceptance: whether the shop accepts takeaway, dine-in, or both.
  const [shopAcceptance, setShopAcceptance] = useState('takeaway'); // 'takeaway' | 'dine-in' | 'both'
  const [orderMode, setOrderMode] = useState(null); // 'today_only' | 'today_and_preorder' | 'preorder_only'

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

  const groupsById = useMemo(() => {
    const map = {};
    for (const g of optionGroupsLibrary) map[g.id] = g;
    return map;
  }, [optionGroupsLibrary]);

  // Resolve an item's attached reusable groups (in the item's attach order).
  const resolveItemGroups = useCallback(
    (item) => (item?.optionGroupIds ?? []).map((gid) => groupsById[gid]).filter(Boolean),
    [groupsById]
  );

  const groupUsageCountById = useMemo(() => {
    const map = {};
    for (const i of items) {
      for (const gid of (i.optionGroupIds ?? [])) map[gid] = (map[gid] ?? 0) + 1;
    }
    return map;
  }, [items]);

  const selectedItemGroups = useMemo(() => resolveItemGroups(selectedItem), [resolveItemGroups, selectedItem]);
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
    setSelectedGroupOptionQtys(buildDefaultGroupSelections(resolveItemGroups(item)));
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

  useEffect(() => {
    apiClient
      .get(MENU)
      .then((res) => {
        const data = res.data?.data;

        // A new shop has no Menus row yet. The API still returns release
        // metadata, so `data` is present but there are no menu collections.
        // Initialize a usable draft instead of treating that valid empty state
        // as a missing shop/session.
        if (!Array.isArray(data?.categories)) {
          setCategories([
            { id: makeId(), name: 'For You', isVisible: true },
            { id: makeId(), name: 'Main', isVisible: true },
          ]);
          setItems([]);
          setOptionGroupsLibrary([]);
        } else {
          setCategories(data.categories);
          const rawLibrary = (data.optionGroupsLibrary ?? []).map(mapApiGroupToState);
          const rawItems = (data.items ?? []).map(mapApiItemToState);
          const { items: migratedItems, library, didMigrate } = migrateMenuToLibrary(rawItems, rawLibrary);
          setItems(migratedItems);
          setOptionGroupsLibrary(library);
          // Legacy embedded groups were hoisted into the library — enable Save so the
          // migrated structure gets persisted.
          if (didMigrate) setHasUnsavedEdits(true);
        }
        if (data?.shopAcceptance) setShopAcceptance(data.shopAcceptance);
        if (Number.isFinite(Number(data?.prepBufferMinutes))) setPrepBufferMinutes(Math.max(0, Number(data.prepBufferMinutes)));
        if (data?.isEdit !== undefined) setIsEdit(data.isEdit);
        if (data?.releaseStatus) setReleaseStatus(data.releaseStatus);
        // Show the Publish button as available on load if there are saved-but-unpublished changes.
        if (data?.isChanges !== undefined) setHasChanges(!!data.isChanges);
      })
      .catch((err) => {
        setLoadError(err?.response?.data?.error?.message ?? 'Failed to load menu. Please refresh.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchReleaseStatus = async () => {
      try {
        const res = await apiClient.get(RELEASE_STATUS);
        const data = res.data;
        if (data?.data?.status) setReleaseStatus(data.data.status);
      } catch {
        // Non-critical
      }
    };
    fetchReleaseStatus();
  }, []);

  // Load the shop's order mode so per-item sold-out toggles can offer the right
  // scope(s): today (immediate), pre-order, or both.
  useEffect(() => {
    const fetchOrderMode = async () => {
      try {
        const res = await apiClient.get(ORDERING_SETTINGS);
        const mode = res.data?.data?.orderMode;
        if (mode) setOrderMode(mode);
      } catch {
        // Non-critical — falls back to the single (immediate) sold-out toggle.
      }
    };
    fetchOrderMode();
  }, []);

  const visibleCategories = useMemo(() => {
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
    markMenuChanged();
    stopReorder();
  };

  // Reorder an item within its category. Items render in the `items` array order,
  // so we move it just past its neighbour in that global array (dir = -1 up / +1 down).
  const moveItemInCategory = (catItems, fromPos, dir) => {
    const toPos = fromPos + dir;
    if (toPos < 0 || toPos >= catItems.length) return;
    const movingId = catItems[fromPos].id;
    const targetId = catItems[toPos].id;
    setItems((prev) => {
      const from = prev.findIndex((i) => i.id === movingId);
      const to = prev.findIndex((i) => i.id === targetId);
      if (from < 0 || to < 0) return prev;
      return arrayMove(prev, from, to);
    });
    markMenuChanged();
  };

  // Reorder an option within the group being edited (customers see options in this order).
  const moveGroupOption = (fromPos, dir) => {
    setGroupEditor((prev) => {
      const opts = prev.options ?? [];
      const toPos = fromPos + dir;
      if (toPos < 0 || toPos >= opts.length) return prev;
      return { ...prev, options: arrayMove(opts, fromPos, toPos) };
    });
    markMenuChanged();
  };

  // Reorder the shop's group library. Purely how the list reads to the
  // merchant — items hold group ids, so nothing customers see moves with it.
  const moveOptionGroup = (fromPos, dir) => {
    setOptionGroupsLibrary((prev) => {
      const toPos = fromPos + dir;
      if (toPos < 0 || toPos >= prev.length) return prev;
      return arrayMove(prev, fromPos, toPos);
    });
    markMenuChanged();
  };

  // Item editor modal.
  const [isItemEditorOpen, setIsItemEditorOpen] = useState(false);
  const [itemEditor, setItemEditor] = useState(getDefaultItem(categories?.[0]?.id));
  const [editorPhotoImages, setEditorPhotoImages] = useState([]);

  // Reusable option group editor modal.
  const [isGroupEditorOpen, setIsGroupEditorOpen] = useState(false);
  const [groupEditor, setGroupEditor] = useState(getDefaultGroup());
  // When the editor is opened from within the item editor, a newly created group is
  // auto-attached to the item being edited.
  const [attachNewGroupToItem, setAttachNewGroupToItem] = useState(false);
  const [blockedDeleteGroup, setBlockedDeleteGroup] = useState(null); // { referenceName, usedBy }
  // A modified shared group waiting for the "this updates every item" confirmation.
  const [pendingGroupSave, setPendingGroupSave] = useState(null);

  const openNewGroupEditor = (fromItemEditor = false) => {
    setGroupEditor(getDefaultGroup());
    setAttachNewGroupToItem(fromItemEditor);
    setIsGroupEditorOpen(true);
  };

  const openEditGroupEditor = (group) => {
    setGroupEditor(JSON.parse(JSON.stringify(group)));
    setAttachNewGroupToItem(false);
    setIsGroupEditorOpen(true);
  };

  const setGroupEditorField = (patch) => {
    setGroupEditor((prev) => ({ ...prev, ...patch }));
  };

  const applyGroupSave = (normalizedGroup) => {
    setOptionGroupsLibrary((prev) => {
      const exists = prev.some((g) => g.id === normalizedGroup.id);
      return exists ? prev.map((g) => (g.id === normalizedGroup.id ? normalizedGroup : g)) : [...prev, normalizedGroup];
    });

    if (attachNewGroupToItem && !groupEditor.id) {
      setItemEditor((prev) => ({
        ...prev,
        optionGroupIds: [...(prev.optionGroupIds ?? []), normalizedGroup.id],
      }));
    }

    markMenuChanged();
    setPendingGroupSave(null);
    setIsGroupEditorOpen(false);
    setAttachNewGroupToItem(false);
  };

  const handleGroupEditorSubmit = (event) => {
    event.preventDefault();

    const referenceName = (groupEditor.referenceName ?? '').trim();
    const displayName = (groupEditor.name ?? '').trim();
    if (!displayName) return;

    const normalizedGroup = {
      id: groupEditor.id ?? makeId(),
      referenceName,
      name: displayName,
      // `required` is derived: a group is required when it needs at least one pick.
      min: Math.max(0, normalizeNumber(groupEditor.min ?? 0)),
      required: Math.max(0, normalizeNumber(groupEditor.min ?? 0)) >= 1,
      pick: Math.max(0, normalizeNumber(groupEditor.pick ?? 0)),
      options: (groupEditor.options ?? [])
        .map((o) => ({
          id: o.id ?? makeId(),
          name: (o.name ?? '').trim(),
          additionalPrice: normalizeNumber(o.additionalPrice),
          maxQty: Math.max(1, normalizeNumber(o.maxQty ?? 1)),
          soldOut: !!o.soldOut, soldOutPreorder: !!o.soldOutPreorder,
        }))
        .filter((o) => !!o.name),
    };

    // Editing an existing group that items already use, with real (customer-visible)
    // changes → confirm before applying, since the edit hits every item at once.
    const existing = groupEditor.id ? optionGroupsLibrary.find((g) => g.id === groupEditor.id) : null;
    const usedBy = existing ? (groupUsageCountById[existing.id] ?? 0) : 0;
    const contentChanged = existing ? groupComparable(existing) !== groupComparable(normalizedGroup) : false;

    if (existing && usedBy > 0 && contentChanged) {
      setPendingGroupSave(normalizedGroup);
      return;
    }

    applyGroupSave(normalizedGroup);
  };

  const handleDeleteGroup = (group) => {
    const usedBy = items.filter((i) => (i.optionGroupIds ?? []).includes(group.id)).length;
    if (usedBy > 0) {
      setBlockedDeleteGroup({ referenceName: groupLabel(group), usedBy });
      return;
    }
    setOptionGroupsLibrary((prev) => prev.filter((g) => g.id !== group.id));
    markMenuChanged();
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);
  const [isPublishLoading, setIsPublishLoading] = useState(false);
  const [isPublishSuccess, setIsPublishSuccess] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  // Per-item gear-menu anchor: { itemId, el }
  const [itemMenuAnchor, setItemMenuAnchor] = useState(null);
  const [addGroupMenuAnchor, setAddGroupMenuAnchor] = useState(null); // "Add existing group" dropdown in the item editor
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
      ? { name: editorPhotoImages[0].name ?? 'photo', url: editorPhotoImages[0].url, file: editorPhotoImages[0].file ?? null }
      : null;

    if (!itemEditor?.name?.trim()) return;
    if (!itemEditor.categoryIds?.length) return;

    const normalizedItem = {
      ...itemEditor,
      takeawayBasePrice: normalizeNumber(itemEditor.takeawayBasePrice),
      // Same figure: there is one price field, so an item saved from this
      // editor must not keep a divergent dine-in price the merchant can no
      // longer see or change.
      dineInPrice: normalizeNumber(itemEditor.takeawayBasePrice),
      prepTimeMinutes: Math.max(0, normalizeNumber(itemEditor.prepTimeMinutes)),
      pricingOverrideCustomPercent: normalizeNumber(itemEditor.pricingOverrideCustomPercent),
      pricingOverrideFixedPrice: normalizeNumber(itemEditor.pricingOverrideFixedPrice),
      photo,
      optionGroupIds: (itemEditor.optionGroupIds ?? []).filter((gid) => optionGroupsLibrary.some((g) => g.id === gid)),
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
    markMenuChanged();
    closeItemEditor();
  };

  const deleteItem = (itemId) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    markMenuChanged();
  };

  const handleQuickFeatured = (itemId, nextValue) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, featured: nextValue } : i)));
    markMenuChanged();
  };

  const handleQuickAvailability = (itemId, patch) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
    markMenuChanged();
  };

  const handlePublishMenu = async (status = 'published') => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const formData = new FormData();
      formData.append('status', status);

      // Denormalized snapshot of an item's attached groups. Only the customer-facing
      // display name is embedded — referenceName stays in optionGroupsLibrary.
      const denormalizedGroupsForItem = (i) => (i.optionGroupIds ?? [])
        .map((gid) => optionGroupsLibrary.find((g) => g.id === gid))
        .filter(Boolean)
        .map((g) => ({
          id: g.id,
          name: g.name,
          required: !!g.required, min: normalizeNumber(g.min ?? (g.required ? 1 : 0)),
          pick: normalizeNumber(g.pick ?? 0),
          options: (g.options ?? []).map((o) => ({
            id: o.id,
            name: o.name,
            additionalPrice: normalizeNumber(o.additionalPrice),
            maxQty: Math.max(1, normalizeNumber(o.maxQty ?? 1)),
            soldOut: !!o.soldOut, soldOutPreorder: !!o.soldOutPreorder,
          })),
        }));

      const menuPayload = {
        storePricing,
        shopAcceptance,
        prepBufferMinutes: Math.max(0, normalizeNumber(prepBufferMinutes)),
        optionGroupsLibrary: optionGroupsLibrary.map((g) => ({
          id: g.id,
          referenceName: g.referenceName,
          name: g.name,
          required: !!g.required, min: normalizeNumber(g.min ?? (g.required ? 1 : 0)),
          pick: normalizeNumber(g.pick ?? 0),
          options: (g.options ?? []).map((o) => ({
            id: o.id,
            name: o.name,
            additionalPrice: normalizeNumber(o.additionalPrice),
            maxQty: Math.max(1, normalizeNumber(o.maxQty ?? 1)),
            soldOut: !!o.soldOut, soldOutPreorder: !!o.soldOutPreorder,
          })),
        })),
        categories: categories.map((c, idx) => ({
          id: c.id,
          name: c.name,
          isVisible: c.isVisible,
          sortIndex: idx,
        })),
        items: items.map((i) => {
          const groups = denormalizedGroupsForItem(i);
          return {
          id: i.id,
          categoryIds: i.categoryIds ?? [],
          // When photo.file exists it will be sent as a separate FormData field;
          // signal to the backend by setting url to null.
          photo: i.photo
            ? { name: i.photo.name, url: i.photo.file ? null : i.photo.url }
            : null,
          name: i.name,
          description: i.description,
          takeawayBasePrice: normalizeNumber(i.takeawayBasePrice),
          dineInPrice: normalizeNumber(i.dineInPrice),
          prepTimeMinutes: Math.max(0, normalizeNumber(i.prepTimeMinutes)),
          soldOut: !!i.soldOut,
          soldOutPreorder: !!i.soldOutPreorder,
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
          optionGroupIds: i.optionGroupIds ?? [],
          // Kept embedded (resolved) for backward compatibility with the customer
          // app and walk-in ordering, which read groups off the item.
          optionGroups: groups,
          // Lowest add-on a customer must pay (cheapest required options) — lets the
          // customer app show a correct "from" price without recomputing.
          minAddOn: minRequiredAddOn(groups),
          };
        }),
      };

      formData.append('menu', JSON.stringify(menuPayload));

      for (const i of items) {
        if (i.photo?.file) {
          formData.append(`item_photo_${i.id}`, i.photo.file);
        }
      }

      await apiClient.post(MENU, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setHasChanges(true);
      setHasUnsavedEdits(false);
      setIsSaveSuccess(true);
      setIsPublishSuccess(false);
    } catch (err) {
      setSaveError(err?.response?.data?.message ?? 'Failed to save menu. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const markMenuChanged = () => { setHasUnsavedEdits(true); setIsSaveSuccess(false); };

  /*
    Sold out, applied immediately — no Save, no Publish, same endpoint the
    terminal uses. Deliberately not marked as a menu change: it is already
    persisted, and flagging it would ask the merchant to publish something that
    has already reached customers.
  */
  const toggleItemSoldOut = async (item) => {
    const scope = orderMode === 'preorder_only' ? 'preorder' : 'immediate';
    const field = scope === 'preorder' ? 'soldOutPreorder' : 'soldOut';
    const next = !item[field];

    setSoldOutSavingId(item.id);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, [field]: next } : i)));
    try {
      await apiClient.put(MENU_SOLD_OUT, { itemId: item.id, soldOut: next, scope });
      setSaveError(null);
    } catch (err) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, [field]: !next } : i)));
      setSaveError(err?.response?.data?.message ?? 'Failed to update availability.');
    } finally {
      setSoldOutSavingId(null);
    }
  };

  const handlePublishMenuUpdate = () => setShowPublishConfirm(true);

  const handleConfirmPublishMenuUpdate = async () => {
    setShowPublishConfirm(false);
    setIsPublishLoading(true);
    setIsPublishSuccess(false);
    try {
      await apiClient.post(PUBLISH_MENU_UPDATE);
      setIsPublishSuccess(true);
      setHasChanges(false);
    } catch (err) {
      setSaveError(err?.response?.data?.message ?? 'Failed to publish menu update.');
    } finally {
      setIsPublishLoading(false);
    }
  };

  // Preview computations for the currently selected item, for the current preview mode.
  const previewPricing = useMemo(() => {
    if (!selectedItem) return null;

    const computePreviewPricingForMode = (mode) => {
      const baseForFees = computeBaseForFees({ item: selectedItem, fulfilmentMode: mode });
      const optionsDelta = computeOptionsDelta({ selectedGroupOptionQtys, groups: selectedItemGroups });

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
  }, [selectedItem, selectedItemGroups, selectedGroupOptionQtys, customerMode, storePricing]);

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
    for (const g of selectedItemGroups) {
      if (!g.required) continue;
      const availableCount = (g.options ?? []).filter((o) => !o.soldOut).length;
      // Clamp the MUST pick to what's actually orderable so sold-out options can't deadlock the item.
      const requiredPick = Math.min(
        normalizeNumber(g.pick ?? 0) > 0 ? normalizeNumber(g.pick ?? 0) : 1,
        availableCount
      );
      const gSel = sel[g.id] ?? {};
      const count = Object.values(gSel).reduce((s, q) => s + (q > 0 ? 1 : 0), 0);
      if (count !== requiredPick) return false;
    }
    return true;
  }, [selectedItem, selectedItemGroups, selectedGroupOptionQtys]);

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

  if (isLoading) {
    return (
      <div className={styles.root}>
        {/* Header skeleton */}
        <div className={styles.stickyHeader}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Shimmer width="180px" height="28px" borderRadius="6px" responsive={false} />
              <Shimmer width="320px" height="16px" borderRadius="4px" responsive={false} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <Shimmer width="100px" height="36px" borderRadius="8px" responsive={false} />
                <Shimmer width="80px" height="36px" borderRadius="8px" responsive={false} />
              </div>
          </div>
        </div>

        <div className={styles.layout}>
          {/* Left column skeleton */}
          <div className={styles.cardStack}>
            {/* Shop accepts card */}
            <ContentCard>
              <Shimmer width="140px" height="20px" borderRadius="4px" responsive={false} style={{ marginBottom: 12 }} />
              <div style={{ display: 'flex', gap: 20 }}>
                <Shimmer width="110px" height="20px" borderRadius="4px" responsive={false} />
                <Shimmer width="110px" height="20px" borderRadius="4px" responsive={false} />
                <Shimmer width="60px" height="20px" borderRadius="4px" responsive={false} />
              </div>
            </ContentCard>

            {/* Categories card */}
            <ContentCard>
              <Shimmer width="120px" height="20px" borderRadius="4px" responsive={false} style={{ marginBottom: 16 }} />
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <Shimmer height="40px" borderRadius="8px" />
                <Shimmer width="130px" height="40px" borderRadius="8px" responsive={false} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2].map((i) => (
                  <div key={i} className={styles.categoryRow}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <Shimmer width="16px" height="20px" borderRadius="3px" responsive={false} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <Shimmer width="100px" height="16px" borderRadius="4px" responsive={false} />
                        <Shimmer width="60px" height="12px" borderRadius="4px" responsive={false} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Shimmer width="36px" height="22px" borderRadius="999px" responsive={false} />
                      <Shimmer width="28px" height="28px" borderRadius="50%" responsive={false} />
                    </div>
                  </div>
                ))}
              </div>
            </ContentCard>

            {/* Items card */}
            <ContentCard>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Shimmer width="60px" height="20px" borderRadius="4px" responsive={false} />
                <Shimmer width="100px" height="36px" borderRadius="8px" responsive={false} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[1, 2].map((cat) => (
                  <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Shimmer width="110px" height="22px" borderRadius="4px" responsive={false} />
                    {[1, 2].map((item) => (
                      <div key={item} className={styles.itemRow}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <Shimmer width="44px" height="44px" borderRadius="8px" responsive={false} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <Shimmer width="120px" height="16px" borderRadius="4px" responsive={false} />
                            <Shimmer width="90px" height="12px" borderRadius="4px" responsive={false} />
                          </div>
                        </div>
                        <Shimmer width="48px" height="22px" borderRadius="999px" responsive={false} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </ContentCard>
          </div>

          {/* Right column skeleton (preview panel) */}
          <div className={styles.previewBox}>
            <ContentCard className={styles.fullWidth}>
              <Shimmer width="140px" height="20px" borderRadius="4px" responsive={false} style={{ marginBottom: 8 }} />
              <Shimmer width="260px" height="14px" borderRadius="4px" responsive={false} style={{ marginBottom: 20 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={styles.itemRow}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <Shimmer width="44px" height="44px" borderRadius="8px" responsive={false} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <Shimmer width="110px" height="16px" borderRadius="4px" responsive={false} />
                        <Shimmer width="70px" height="12px" borderRadius="4px" responsive={false} />
                      </div>
                    </div>
                    <Shimmer width="28px" height="28px" borderRadius="50%" responsive={false} />
                  </div>
                ))}
              </div>
            </ContentCard>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ padding: 24 }}>
        <Alert severity="error">{loadError}</Alert>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.stickyHeader}>
        <HeaderSection
          title="Menu Builder"
          description={
            <p>
              Set up categories, items, and pricing rules.
            </p>
          }
          showButton={false}
          showCancelButton={false}
          isSuccess={false}
          infoMessage={
            !isEdit
              ? 'The information has been submitted for release and is currently under review. To make any changes, please cancel it under Release Submission.'
              : !canEditMenu
                ? 'View only, mostly. You can mark items sold out; only an Owner or Manager can change the menu itself.'
                : null
          }
          rightActions={
            <>
              <PermissionGate allowed={canEditMenu} capability={CAP.MENU_EDIT}>
                <Button
                  size="small"
                  variant="contained"
                  loading={isSaving}
                  loadingPosition="start"
                  startIcon={isSaveSuccess ? <FaCheck /> : undefined}
                  disabled={!canEditContent || !hasUnsavedEdits}
                  onClick={() => handlePublishMenu('draft')}
                  sx={{ textTransform: 'none' }}
                >
                  {isSaveSuccess ? 'Saved' : 'Save Menu'}
                </Button>
              </PermissionGate>
              {releaseStatus === 'Released' && (
                <PermissionGate allowed={canEditMenu} capability={CAP.MENU_EDIT}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    loading={isPublishLoading}
                    loadingPosition="start"
                    startIcon={isPublishSuccess ? <FaCheck /> : undefined}
                    disabled={isPublishSuccess || !hasChanges || hasUnsavedEdits}
                    onClick={handlePublishMenuUpdate}
                    sx={{ textTransform: 'none' }}
                  >
                    {isPublishSuccess ? 'Update Published' : 'Publish Update'}
                  </Button>
                </PermissionGate>
              )}
              <IconButton
                size="small"
                onClick={openPreviewFullscreen}
                title="Open menu preview"
                sx={{ display: 'none', '@media (max-width: 1100px)': { display: 'inline-flex' } }}
              >
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </>
          }
        />
        {saveError && (
          <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mt: 1 }}>
            {saveError}
          </Alert>
        )}
      </div>

      <div className={styles.layout}>
        <div className={styles.cardStack}>
          <ContentCard>
            <div className={styles.sectionHeader}>
              <FieldHeader
                title="Order Timing"
                type="h3"
                description="Estimated completion for a new order = buffer time + total avg. make time of the items. Shown on POS orders; you can still adjust each order manually."
              />
            </div>
            <TextField
              type="number"
              label="Buffer time (minutes)"
              size="small"
              value={prepBufferMinutes}
              disabled={!canEditContent}
              onChange={(e) => { setPrepBufferMinutes(Math.max(0, normalizeNumber(e.target.value))); markMenuChanged(); }}
              inputProps={{ min: 0, step: 1 }}
              helperText="Default 15 — covers queueing, packing, and hand-off"
              style={{ width: 220 }}
            />
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
                disabled={!canEditContent}
              />
              <Button
                variant="contained"
                sx={{ textTransform: 'none' }}
                disabled={!canEditContent}
                onClick={() => {
                  const name = newCategoryName.trim();
                  if (!name) return;
                  setCategories((prev) => [...prev, { id: makeId(), name, isVisible: true }]);
                  setNewCategoryName('');
                  markMenuChanged();
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
                      disabled={!canEditContent}
                      onChange={(e) => { setCategories((prev) => prev.map((x) => (x.id === cat.id ? { ...x, isVisible: e.target.checked } : x))); markMenuChanged(); }}
                      size="small"
                    />
                    <IconButton
                      size="small"
                      color="error"
                      disabled={!canEditContent}
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
                <FieldHeader
                  title="Option Groups (Reusable)"
                  type="h3"
                  description="Create a group once (e.g. “Combo”, “Drink”, “Add Ons”) and attach it to multiple items. The reference name is only visible to you — customers only see the group name."
                />
                <Button variant="contained" sx={{ textTransform: 'none' }} disabled={!canEditContent} onClick={() => openNewGroupEditor(false)}>
                  Add Option Group
                </Button>
              </div>
            </div>

            {optionGroupsLibrary.length === 0 ? (
              <Typography variant="body2" className={styles.muted}>
                No option groups yet. Create one here, then attach it to items in the item editor.
              </Typography>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {optionGroupsLibrary.map((g, idx) => {
                  const usedBy = groupUsageCountById[g.id] ?? 0;
                  const soldOutCount = (g.options ?? []).filter((o) => o.soldOut).length;
                  return (
                    <div key={g.id} className={styles.categoryRow}>
                      <div style={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" style={{ fontWeight: 800 }}>{groupLabel(g)}</Typography>
                        <Typography variant="caption" className={styles.muted}>
                          Customers see: &ldquo;{g.name}&rdquo; · {(g.options ?? []).length} option{(g.options ?? []).length === 1 ? '' : 's'}
                          {soldOutCount > 0 ? ` (${soldOutCount} sold out)` : ''}
                          {' · '}Used by {usedBy} item{usedBy === 1 ? '' : 's'}
                        </Typography>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <IconButton
                            size="small"
                            disabled={!canEditContent || idx === 0}
                            onClick={() => moveOptionGroup(idx, -1)}
                            aria-label="Move group up"
                            style={{ padding: 2 }}
                          >
                            <KeyboardArrowUpRoundedIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            disabled={!canEditContent || idx === optionGroupsLibrary.length - 1}
                            onClick={() => moveOptionGroup(idx, 1)}
                            aria-label="Move group down"
                            style={{ padding: 2 }}
                          >
                            <KeyboardArrowDownRoundedIcon fontSize="small" />
                          </IconButton>
                        </div>
                        <IconButton size="small" disabled={!canEditContent} onClick={() => openEditGroupEditor(g)} title="Edit group">
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={!canEditContent}
                          onClick={() => handleDeleteGroup(g)}
                          title="Delete group"
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ContentCard>

          <ContentCard>
            <div className={styles.sectionHeader}>
              <div className={styles.row} style={{ justifyContent: 'space-between' }}>
                <FieldHeader title="Items" type="h3" description="Add/edit/delete items with photo, pricing, and avg. make time. Use the arrows to set the order customers see. Manage sold-out in each item's Availability section." />
                <Button variant="contained" sx={{ textTransform: 'none' }} disabled={!canEditContent} onClick={openNewItemEditor}>
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
                        {catItems.map((item, idx) => (
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
                                  {(() => {
                                    // Show the customer-facing "from" price: base + cheapest required options.
                                    const groups = (item.optionGroupIds ?? []).map((gid) => optionGroupsLibrary.find((g) => g.id === gid)).filter(Boolean);
                                    const addOn = minRequiredAddOn(groups);
                                    const prefix = groups.length > 0 ? 'From ' : '';
                                    const takeawayFrom = normalizeNumber(item.takeawayBasePrice) + addOn;
                                    const dineInFrom = normalizeNumber(item.dineInPrice) + addOn;
                                    const showTakeaway = shopAcceptance !== 'dine-in';
                                    const showDineIn = shopAcceptance !== 'takeaway';
                                    if (showTakeaway && showDineIn) {
                                      return takeawayFrom === dineInFrom
                                        ? `${prefix}${formatMoney(takeawayFrom)}`
                                        : `${prefix}${formatMoney(takeawayFrom)} / ${formatMoney(dineInFrom)}`;
                                    }
                                    return `${prefix}${formatMoney(showTakeaway ? takeawayFrom : dineInFrom)}`;
                                  })()}
                                </Typography>
                              </div>
                            </div>

                            <div className={styles.row} style={{ gap: 10 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 64 }}>
                                <Typography variant="caption" className={styles.muted}>Avg. time</Typography>
                                <Typography variant="caption" style={{ fontWeight: 800 }}>
                                  {item.prepTimeMinutes > 0 ? `${item.prepTimeMinutes} min` : '—'}
                                </Typography>
                              </div>
                              {(() => {
                                const scopeField = orderMode === 'preorder_only' ? 'soldOutPreorder' : 'soldOut';
                                const isSoldOut = !!item[scopeField];
                                return (
                                  <PermissionGate
                                    allowed={canToggleAvailability}
                                    capability={CAP.MENU_AVAILABILITY}
                                  >
                                    <FormControlLabel
                                      sx={{ margin: 0 }}
                                      // Held back while the menu has unsaved
                                      // edits: this writes to the stored menu,
                                      // so the two copies would disagree until
                                      // the next Save. A different reason from
                                      // the permission one, so it says so
                                      // rather than borrowing that tooltip.
                                      disabled={hasUnsavedEdits}
                                      title={hasUnsavedEdits ? 'Save your menu changes first' : undefined}
                                      label={
                                        <Typography variant="caption" className={isSoldOut ? styles.soldOutBadge : styles.muted}>
                                          Sold out
                                        </Typography>
                                      }
                                      control={
                                        <Switch
                                          size="small"
                                          checked={isSoldOut}
                                          disabled={soldOutSavingId === item.id}
                                          onChange={() => toggleItemSoldOut(item)}
                                          inputProps={{ 'aria-label': `Sold out: ${item.name}` }}
                                        />
                                      }
                                    />
                                  </PermissionGate>
                                );
                              })()}
                              <div style={{ display: 'flex', flexDirection: 'column' }} title="Reorder within this category">
                                <IconButton size="small" disabled={!canEditContent || idx === 0} onClick={() => moveItemInCategory(catItems, idx, -1)} aria-label="Move up" style={{ padding: 2 }}>
                                  <KeyboardArrowUpRoundedIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" disabled={!canEditContent || idx === catItems.length - 1} onClick={() => moveItemInCategory(catItems, idx, 1)} aria-label="Move down" style={{ padding: 2 }}>
                                  <KeyboardArrowDownRoundedIcon fontSize="small" />
                                </IconButton>
                              </div>
                              <IconButton size="small" disabled={!canEditContent} onClick={(e) => openItemMenu(e, item.id)}>
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
                                    {item.prepTimeMinutes > 0 ? <> · ~{item.prepTimeMinutes} min</> : null}
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: '#f5f5f5',
            borderBottom: '1px solid rgba(0,0,0,0.1)',
          }}>
            <Typography variant="h6" style={{ fontWeight: 900 }}>Menu Preview</Typography>
            <IconButton size="small" onClick={closePreviewFullscreen}>×</IconButton>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
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
                const selectionParts = resolveItemGroups(item).flatMap((g) => {
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
              {selectedItemGroups.length ? (
                selectedItemGroups.map((g) => {
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

                          const isOptionSoldOut = !!o.soldOut;

                          const isMust = required && (pick > 0 || required);
                          if (isMust && (pick || 1) > 0) {
                            const checked = qty > 0;
                            const disableCheck = isOptionSoldOut || (!checked && !canSelectMore);
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
                                  <span style={isOptionSoldOut ? { opacity: 0.55 } : undefined}>
                                    {o.name}
                                    {o.additionalPrice ? ` (+${formatMoney(o.additionalPrice)})` : ''}
                                    {isOptionSoldOut ? <span className={styles.soldOutBadge} style={{ marginLeft: 8 }}>Sold out</span> : null}
                                  </span>
                                }
                              />
                            );
                          }

                          const canIncrease = !isOptionSoldOut && qty < maxQty && (pick === 0 || selectedCount < pick || qty > 0);
                          return (
                            <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <span style={{ flex: 1, ...(isOptionSoldOut ? { opacity: 0.55 } : {}) }}>
                                {o.name}
                                {o.additionalPrice ? ` (+${formatMoney(o.additionalPrice)} each` : ''}
                                {o.additionalPrice && maxQty > 1 ? `, Max: ${maxQty})` : o.additionalPrice ? ')' : ''}
                                {isOptionSoldOut ? <span className={styles.soldOutBadge} style={{ marginLeft: 8 }}>Sold out</span> : null}
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

              {selectedItem.prepTimeMinutes > 0 ? (
                <div className={styles.breakdownLine}>
                  <span className={styles.muted}>Est. make time</span>
                  <span style={{ fontWeight: 800 }}>~{selectedItem.prepTimeMinutes} min</span>
                </div>
              ) : null}

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
            {/* One price per item, whatever the shop accepts. The stored menu
                still carries a takeaway and a dine-in figure — the preview, the
                POS and the storefront each read one of them depending on
                fulfilment — so this field writes both and saving keeps them in
                step, rather than unpicking that model everywhere. */}
            <TextField
              type="number"
              label="Price (SGD $)"
              fullWidth
              size="small"
              value={itemEditor.takeawayBasePrice}
              onChange={(e) => {
                const price = normalizeNumber(e.target.value);
                setItemEditorField({ takeawayBasePrice: price, dineInPrice: price });
              }}
              inputProps={{ min: 0, step: 0.01 }}
            />
            <TextField
              type="number"
              label="Avg. make time (minutes)"
              fullWidth
              size="small"
              value={itemEditor.prepTimeMinutes}
              onChange={(e) => setItemEditorField({ prepTimeMinutes: Math.max(0, normalizeNumber(e.target.value)) })}
              inputProps={{ min: 0, step: 1 }}
              helperText="Used to estimate waiting time — not shown to customers"
            />
          </div>

          <div className={styles.dividerLine} />

          <FieldHeader title="Item image (Optional)" type="h4" description="Upload a photo for this menu item." />
          <DragDropImageUploader
            images={editorPhotoImages}
            setImages={setEditorPhotoImages}
            noOfImages={1}
            isMultiple={false}
            resetSaving={() => {}}
            width={120}
            height={120}
            imageClassName={styles.itemImageThumb}
            disabled={false}
          />

          <div className={styles.dividerLine} />

          <FieldHeader
            title="Option Groups"
            type="h4"
            description="Add choices to this item (e.g. size, add-ons). Create a new group, or add one you've already made — groups can be reused across items. Customers see them in the order below."
          />

          {(() => {
            const attachedIds = itemEditor.optionGroupIds ?? [];
            const attached = attachedIds.map((gid) => optionGroupsLibrary.find((g) => g.id === gid)).filter(Boolean);
            const available = optionGroupsLibrary.filter((g) => !attachedIds.includes(g.id));
            const attach = (gid) => setItemEditorField({ optionGroupIds: [...attachedIds, gid] });
            const detach = (gid) => setItemEditorField({ optionGroupIds: attachedIds.filter((x) => x !== gid) });
            // Customers meet the groups in this order — resolveItemGroups walks
            // optionGroupIds — so "size before add-ons" is set here, by id rather
            // than by row so a stale id in the list can't shift the wrong one.
            const moveAttached = (gid, dir) => {
              const from = attachedIds.indexOf(gid);
              const to = from + dir;
              if (from < 0 || to < 0 || to >= attachedIds.length) return;
              setItemEditorField({ optionGroupIds: arrayMove(attachedIds, from, to) });
            };
            const groupSummary = (g) => {
              const n = (g.options ?? []).length;
              const soldOutCount = (g.options ?? []).filter((o) => o.soldOut).length;
              const min = normalizeNumber(g.min ?? (g.required ? 1 : 0));
              const max = normalizeNumber(g.pick ?? 0);
              let rule = '';
              if (min > 0 && max > 0) rule = min === max ? ` · Choose ${min}` : ` · Choose ${min}–${max}`;
              else if (min > 0) rule = ` · Choose at least ${min}`;
              else if (max > 0) rule = ` · Up to ${max}`;
              return `Customers see: “${g.name}” · ${n} option${n === 1 ? '' : 's'}${soldOutCount > 0 ? ` (${soldOutCount} sold out)` : ''}${rule}`;
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {attached.length === 0 ? (
                  <Typography variant="body2" className={styles.muted}>No option groups added to this item yet.</Typography>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {attached.map((g, idx) => (
                      <div key={g.id} style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, background: '#fafafa' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <IconButton
                            size="small"
                            disabled={idx === 0}
                            onClick={() => moveAttached(g.id, -1)}
                            aria-label="Move group up"
                            style={{ padding: 0 }}
                          >
                            <KeyboardArrowUpRoundedIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            disabled={idx === attached.length - 1}
                            onClick={() => moveAttached(g.id, 1)}
                            aria-label="Move group down"
                            style={{ padding: 0 }}
                          >
                            <KeyboardArrowDownRoundedIcon fontSize="small" />
                          </IconButton>
                        </div>
                        <div
                          role="button"
                          tabIndex={0}
                          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                          title="Edit this option group"
                          onClick={() => openEditGroupEditor(g)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEditGroupEditor(g); } }}
                        >
                          <span style={{ fontWeight: 800 }}>{groupLabel(g)}</span>
                          <Typography variant="caption" className={styles.muted} component="span" style={{ display: 'block' }}>{groupSummary(g)}</Typography>
                        </div>
                        <IconButton size="small" onClick={() => openEditGroupEditor(g)} title="Edit group">
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                        <Button size="small" color="error" sx={{ textTransform: 'none' }} onClick={() => detach(g.id)}>Remove</Button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {available.length > 0 && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddCircleOutlineRoundedIcon fontSize="small" />}
                      sx={{ textTransform: 'none' }}
                      onClick={(e) => setAddGroupMenuAnchor(e.currentTarget)}
                    >
                      Add existing group
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddCircleOutlineRoundedIcon fontSize="small" />}
                    sx={{ textTransform: 'none' }}
                    onClick={() => openNewGroupEditor(true)}
                  >
                    Create new option group
                  </Button>
                </div>

                <Menu
                  anchorEl={addGroupMenuAnchor}
                  open={!!addGroupMenuAnchor}
                  onClose={() => setAddGroupMenuAnchor(null)}
                  slotProps={{ paper: { style: { maxHeight: 340, maxWidth: 440 } } }}
                >
                  {available.map((g) => (
                    <MenuItem
                      key={g.id}
                      onClick={() => { attach(g.id); setAddGroupMenuAnchor(null); }}
                      style={{ display: 'block', whiteSpace: 'normal' }}
                    >
                      <div style={{ fontWeight: 700 }}>{groupLabel(g)}</div>
                      <Typography variant="caption" className={styles.muted}>{groupSummary(g)}</Typography>
                    </MenuItem>
                  ))}
                </Menu>
              </div>
            );
          })()}

          <div className={styles.dividerLine} />

          <FieldHeader title="Display" type="h4" />
          <FormControlLabel
            style={{ margin: 0 }}
            control={<Switch checked={!!itemEditor.featured} onChange={(e) => setItemEditorField({ featured: e.target.checked })} />}
            label={'Featured — show a "Popular" badge on this item'}
          />

          <div className={styles.dividerLine} />

          <FieldHeader
            title="Availability"
            type="h4"
            description="Control when and how this item can be ordered."
          />
          <div className={styles.row} style={{ gap: 8, flexWrap: 'wrap' }}>
            {orderMode !== 'preorder_only' && (
              <FormControlLabel
                control={<Switch checked={!!itemEditor.soldOut} onChange={(e) => setItemEditorField({ soldOut: e.target.checked })} />}
                label={orderMode === 'today_and_preorder' ? 'Sold out (today)' : 'Sold out'}
              />
            )}
            {(orderMode === 'today_and_preorder' || orderMode === 'preorder_only') && (
              <FormControlLabel
                control={<Switch checked={!!itemEditor.soldOutPreorder} onChange={(e) => setItemEditorField({ soldOutPreorder: e.target.checked })} />}
                label={orderMode === 'today_and_preorder' ? 'Sold out (pre-order)' : 'Sold out'}
              />
            )}
            {shopAcceptance === 'both' && (
              <>
                <FormControlLabel
                  control={<Switch checked={!!itemEditor.availableTakeaway} onChange={(e) => setItemEditorField({ availableTakeaway: e.target.checked })} />}
                  label="Available for takeaway"
                />
                <FormControlLabel
                  control={<Switch checked={!!itemEditor.availableDineIn} onChange={(e) => setItemEditorField({ availableDineIn: e.target.checked })} />}
                  label="Available for dine-in"
                />
              </>
            )}
          </div>

          <div className={styles.dividerLine} />

          {(() => {
            const groups = (itemEditor.optionGroupIds ?? []).map((gid) => optionGroupsLibrary.find((g) => g.id === gid)).filter(Boolean);
            const addOn = minRequiredAddOn(groups);
            const takeawayFrom = normalizeNumber(itemEditor.takeawayBasePrice) + addOn;
            const dineInFrom = normalizeNumber(itemEditor.dineInPrice) + addOn;
            const showTakeaway = shopAcceptance !== 'dine-in';
            const showDineIn = shopAcceptance !== 'takeaway';
            return (
              <div style={{ background: '#f4f8ff', border: '1px solid #FFE6D5', borderRadius: 10, padding: '10px 14px' }}>
                <Typography variant="caption" className={styles.muted} style={{ fontWeight: 700, display: 'block' }}>
                  Lowest price customers see{addOn > 0 ? ' — includes the cheapest required options' : ''}
                </Typography>
                <Typography style={{ fontWeight: 900, fontSize: '1.05rem' }}>
                  {showTakeaway && showDineIn
                    ? `Takeaway from ${formatMoney(takeawayFrom)} · Dine-in from ${formatMoney(dineInFrom)}`
                    : showTakeaway
                      ? `From ${formatMoney(takeawayFrom)}`
                      : `From ${formatMoney(dineInFrom)}`}
                </Typography>
              </div>
            );
          })()}
        </div>
      </DialogPopup>

      <DialogPopup
        title={groupEditor?.id ? 'Edit Option Group' : 'Add Option Group'}
        isOpen={isGroupEditorOpen}
        setIsOpen={setIsGroupEditorOpen}
        actionTitle="Save"
        actionDisabled={!groupEditor?.name?.trim()}
        onSubmit={handleGroupEditorSubmit}
        maxWidth="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 24px' }}>
          <FieldHeader
            title="Group details"
            type="h4"
            description="A reusable set of choices (e.g. size, add-ons) you can attach to many items. Customers see the group name and its options."
          />

          {groupEditor?.id && (groupUsageCountById[groupEditor.id] ?? 0) > 0 ? (
            <Alert severity="warning">
              Changes here apply to all {groupUsageCountById[groupEditor.id]} item{(groupUsageCountById[groupEditor.id] ?? 0) === 1 ? '' : 's'} that use this group.
            </Alert>
          ) : null}

          <div className={styles.row} style={{ gap: 16 }}>
            <TextField
              label="Group name"
              fullWidth
              size="small"
              value={groupEditor.name ?? ''}
              onChange={(e) => setGroupEditorField({ name: e.target.value })}
              placeholder="e.g. Choose your size"
              helperText="Shown to customers"
            />
            <TextField
              label="Internal reference (optional)"
              fullWidth
              size="small"
              value={groupEditor.referenceName ?? ''}
              onChange={(e) => setGroupEditorField({ referenceName: e.target.value })}
              placeholder="e.g. Size (drinks)"
              helperText="Only you see this — a nickname for finding the group. Leave it blank to list the group under its name."
            />
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField
              type="number"
              label="Min choices"
              size="small"
              value={groupEditor.min ?? 0}
              onChange={(e) => setGroupEditorField({ min: Math.max(0, normalizeNumber(e.target.value)) })}
              inputProps={{ min: 0, step: 1 }}
              style={{ width: 150 }}
              helperText="0 = optional"
            />
            <TextField
              type="number"
              label="Max choices"
              size="small"
              value={groupEditor.pick ?? 0}
              onChange={(e) => setGroupEditorField({ pick: Math.max(0, normalizeNumber(e.target.value)) })}
              inputProps={{ min: 0, step: 1 }}
              style={{ width: 150 }}
              helperText="0 = no limit"
            />
          </div>

          <div className={styles.dividerLine} />

          <FieldHeader
            title="Options"
            type="h4"
            description="The choices in this group, in the order customers see them (use the arrows to reorder). Mark one sold out to hide it everywhere this group is used."
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(groupEditor.options ?? []).length === 0 ? (
              <Typography variant="body2" className={styles.muted}>No options yet — add your first choice below.</Typography>
            ) : (
              (groupEditor.options ?? []).map((o, idx) => {
                const patchOption = (patch) => setGroupEditor((prev) => ({
                  ...prev,
                  options: (prev.options ?? []).map((y) => (y.id === o.id ? { ...y, ...patch } : y)),
                }));
                return (
                  <div
                    key={o.id}
                    style={{
                      border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: 12,
                      padding: '12px 14px',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      background: '#fafafa',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }} title="Reorder option">
                      <IconButton size="small" disabled={idx === 0} onClick={() => moveGroupOption(idx, -1)} aria-label="Move option up" style={{ padding: 2 }}>
                        <KeyboardArrowUpRoundedIcon fontSize="small" />
                      </IconButton>
                      <Typography variant="caption" className={styles.muted} style={{ fontWeight: 800 }}>{idx + 1}</Typography>
                      <IconButton size="small" disabled={idx === (groupEditor.options ?? []).length - 1} onClick={() => moveGroupOption(idx, 1)} aria-label="Move option down" style={{ padding: 2 }}>
                        <KeyboardArrowDownRoundedIcon fontSize="small" />
                      </IconButton>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <TextField
                        label="Option name"
                        size="small"
                        fullWidth
                        value={o.name ?? ''}
                        placeholder='e.g. "Large", "Extra shot"'
                        onChange={(e) => patchOption({ name: e.target.value })}
                      />
                      <IconButton
                        size="small"
                        color="error"
                        title="Remove option"
                        style={{ marginTop: 2 }}
                        onClick={() => setGroupEditor((prev) => ({ ...prev, options: (prev.options ?? []).filter((y) => y.id !== o.id) }))}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </div>

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <TextField
                        type="number"
                        label="Extra price (SGD $)"
                        size="small"
                        value={o.additionalPrice ?? 0}
                        onChange={(e) => patchOption({ additionalPrice: normalizeNumber(e.target.value) })}
                        inputProps={{ min: 0, step: 0.01 }}
                        style={{ width: 180 }}
                        helperText="Added to the item price"
                      />
                      <TextField
                        type="number"
                        label="Max per order"
                        size="small"
                        value={o.maxQty ?? 1}
                        onChange={(e) => patchOption({ maxQty: Math.max(1, normalizeNumber(e.target.value)) })}
                        inputProps={{ min: 1, step: 1 }}
                        style={{ width: 150 }}
                        helperText="How many a customer can add"
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <Typography variant="caption" className={styles.muted} style={{ fontWeight: 700 }}>Availability</Typography>
                      {orderMode !== 'preorder_only' && (
                        <FormControlLabel
                          style={{ marginRight: 0 }}
                          control={<Switch size="small" checked={!!o.soldOut} onChange={(e) => patchOption({ soldOut: e.target.checked })} />}
                          label={<Typography variant="caption">{orderMode === 'today_and_preorder' ? 'Sold out (today)' : 'Sold out'}</Typography>}
                        />
                      )}
                      {(orderMode === 'today_and_preorder' || orderMode === 'preorder_only') && (
                        <FormControlLabel
                          style={{ marginRight: 0 }}
                          control={<Switch size="small" checked={!!o.soldOutPreorder} onChange={(e) => patchOption({ soldOutPreorder: e.target.checked })} />}
                          label={<Typography variant="caption">{orderMode === 'today_and_preorder' ? 'Sold out (pre-order)' : 'Sold out'}</Typography>}
                        />
                      )}
                    </div>
                    </div>
                  </div>
                );
              })
            )}

            <div>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddCircleOutlineRoundedIcon fontSize="small" />}
                onClick={() => {
                  setGroupEditor((prev) => ({
                    ...prev,
                    options: [...(prev.options ?? []), { id: makeId(), name: '', additionalPrice: 0, maxQty: 1, soldOut: false, soldOutPreorder: false }],
                  }));
                }}
              >
                Add option
              </Button>
            </div>
          </div>
        </div>
      </DialogPopup>

      <DialogPopup
        title="Cannot delete option group"
        isOpen={!!blockedDeleteGroup}
        setIsOpen={(open) => { if (!open) setBlockedDeleteGroup(null); }}
        actionTitle="OK"
        onSubmit={(e) => { e.preventDefault(); setBlockedDeleteGroup(null); }}
      >
        <div style={{ padding: '16px 24px' }}>
          <Typography variant="body1">
            <strong>&ldquo;{blockedDeleteGroup?.referenceName}&rdquo;</strong> is still attached to {blockedDeleteGroup?.usedBy} item{blockedDeleteGroup?.usedBy === 1 ? '' : 's'}.
            Detach it from all items before deleting it.
          </Typography>
        </div>
      </DialogPopup>

      <Dialog open={!!pendingGroupSave} onClose={() => setPendingGroupSave(null)}>
        <DialogTitle>Update shared option group?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>&ldquo;{groupLabel(pendingGroupSave)}&rdquo;</strong> is used by{' '}
            {pendingGroupSave ? (groupUsageCountById[pendingGroupSave.id] ?? 0) : 0} item
            {pendingGroupSave && (groupUsageCountById[pendingGroupSave.id] ?? 0) === 1 ? '' : 's'}.
            Saving these changes will update <strong>every item</strong> that uses this group.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingGroupSave(null)} style={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            style={{ textTransform: 'none' }}
            onClick={() => applyGroupSave(pendingGroupSave)}
          >
            Update all items
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showPublishConfirm} onClose={() => setShowPublishConfirm(false)}>
        <DialogTitle>Publish Update for Menu</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to publish your menu updates? This will make your latest menu changes visible to customers immediately.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPublishConfirm(false)} style={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmPublishMenuUpdate} variant="contained" style={{ textTransform: 'none' }}>
            Publish
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
