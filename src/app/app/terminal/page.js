'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import {
  Tabs,
  Tab,
  Switch,
  Button,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Image from 'next/image';
import Link from 'next/link';
import { FaSync, FaPlus, FaMinus, FaTrashAlt, FaArrowLeft } from 'react-icons/fa';
import styles from './page.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import apiClient from '@/utility/api';
import { getUserDataFromCookie } from '@/utility/cookieUtils';
import { MENU, WALK_IN_ORDER, MENU_SOLD_OUT, SHOP_OPEN, SHOP_ORDERS } from '@/utility/apiPaths';
import { OrderCard, STATUS_FILTERS, orderRef, UndoStatusDialog, EditEtaDialog, CancelOrderDialog } from '../order-queue/_views/OrderCard';

const basePrice = (item, orderType) =>
  Number(orderType === 'dine-in' ? (item.dineInBasePrice ?? item.dineInPrice ?? 0) : (item.takeawayBasePrice ?? 0)) || 0;

// Average time to make one unit of this item (minutes) — used for waiting-time estimates.
const prepMinutes = (item) => Math.max(0, Number(item?.prepTimeMinutes) || 0);

// Resolve an item's option groups. Items saved by the current Menu Builder embed a
// denormalized copy of their reusable groups; older/lean payloads may only carry
// optionGroupIds referencing the shop-level library.
const groupsForItem = (item, library) => {
  const embedded = item?.optionGroups ?? [];
  if (embedded.length) return embedded;
  if (Array.isArray(item?.optionGroupIds) && item.optionGroupIds.length && Array.isArray(library) && library.length) {
    const byId = {};
    for (const g of library) byId[String(g.id)] = g;
    return item.optionGroupIds.map((gid) => byId[String(gid)]).filter(Boolean);
  }
  return [];
};

function computeUnit(item, orderType, selectedOptionIds, groups) {
  let price = basePrice(item, orderType);
  const optionNames = [];
  for (const g of groups ?? []) {
    for (const o of g.options ?? []) {
      if (selectedOptionIds.includes(String(o.id))) {
        price += Number(o.additionalPrice) || 0;
        optionNames.push(o.name);
      }
    }
  }
  return { unitPrice: price, optionNames };
}

const cartKey = (itemId, optionIds, itemNote = '') =>
  `${itemId}__${[...optionIds].sort().join('-')}__${String(itemNote).trim().toLowerCase()}`;

const PAYMENT_METHODS = [
  {
    value: 'credit_card',
    label: 'Manual Credit Card',
    description: 'Card payment received at the counter',
    image: '/images/payments/Credit Card, Apple Pays and Google Pays.png',
  },
  {
    value: 'paynow',
    label: 'PayNow',
    description: 'PayNow or SGQR transfer',
    image: '/images/payments/Paynow.png',
  },
  { value: 'cash', label: 'Cash', description: 'Cash received at the counter', icon: PaymentsOutlinedIcon },
  { value: 'other', label: 'Other payment', description: 'Any other payment method', icon: MoreHorizIcon },
];

// ── Option-picker dialog ────────────────────────────────────────────────────
function OptionDialog({ item, groups, orderType, onClose, onConfirm, onToggleOptionSoldOut, optionSoldOutBusy }) {
  const [sel, setSel] = useState({}); // groupId -> [optionId]
  const [itemNote, setItemNote] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  if (!item) return null;

  const toggle = (group, optionId) => {
    setError('');
    setSel((prev) => {
      const cur = prev[group.id] ?? [];
      const single = group.pick === 1;
      if (single) return { ...prev, [group.id]: [optionId] };
      if (cur.includes(optionId)) return { ...prev, [group.id]: cur.filter((x) => x !== optionId) };
      if (group.pick > 0 && cur.length >= group.pick) return prev; // at max
      return { ...prev, [group.id]: [...cur, optionId] };
    });
  };

  const confirm = () => {
    // Drop options that were marked sold out after being selected.
    const cleaned = {};
    for (const g of groups) {
      const soldOutIds = new Set((g.options ?? []).filter((o) => o.soldOut).map((o) => String(o.id)));
      cleaned[g.id] = (sel[g.id] ?? []).filter((id) => !soldOutIds.has(String(id)));
    }
    for (const g of groups) {
      const n = (cleaned[g.id] ?? []).length;
      if (g.required && n === 0) {
        setError(`Please choose an option for "${g.name}".`);
        return;
      }
    }
    const selectedOptionIds = Object.values(cleaned).flat().map(String);
    const { unitPrice, optionNames } = computeUnit(item, orderType, selectedOptionIds, groups);
    onConfirm({ selectedOptionIds, unitPrice, optionNames, itemNote: itemNote.trim(), quantity });
  };

  const optionLabel = (o) => (
    <span className={o.soldOut ? styles.optSoldOut : undefined}>
      {o.name}
      {o.additionalPrice > 0 ? ` +$${Number(o.additionalPrice).toFixed(2)}` : ''}
      {o.soldOut ? <span className={styles.soldBadge} style={{ marginLeft: 6 }}>Sold out</span> : null}
    </span>
  );

  const soldOutSwitch = (g, o) => (
    <label className={styles.optSoldOutCtl}>
      <Switch
        size="small"
        checked={!!o.soldOut}
        disabled={optionSoldOutBusy === o.id}
        onChange={() => onToggleOptionSoldOut(g, o)}
      />
      <span>Sold out</span>
    </label>
  );

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 1 }}>
        <span>{item.name}</span>
        <IconButton size="small" onClick={onClose} aria-label="close"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        {groups.map((g) => (
          <div key={g.id} className={styles.optGroup}>
            <p className={styles.optGroupName}>
              {g.name}
              {g.required && <span className={styles.req}> *</span>}
              {g.pick > 0 && <span className={styles.pickHint}> (pick {g.pick === 1 ? 1 : `up to ${g.pick}`})</span>}
            </p>
            {g.pick === 1 ? (
              <RadioGroup value={(sel[g.id] ?? [])[0] ?? ''} onChange={(e) => toggle(g, e.target.value)}>
                {(g.options ?? []).map((o) => (
                  <div key={o.id} className={styles.optRow}>
                    <FormControlLabel value={String(o.id)} control={<Radio size="small" />}
                      disabled={!!o.soldOut} label={optionLabel(o)} />
                    {soldOutSwitch(g, o)}
                  </div>
                ))}
              </RadioGroup>
            ) : (
              (g.options ?? []).map((o) => (
                <div key={o.id} className={styles.optRow}>
                  <FormControlLabel
                    control={<Checkbox size="small" checked={(sel[g.id] ?? []).includes(String(o.id))} onChange={() => toggle(g, String(o.id))} />}
                    disabled={!!o.soldOut} label={optionLabel(o)} />
                  {soldOutSwitch(g, o)}
                </div>
              ))
            )}
          </div>
        ))}
        {prepMinutes(item) > 0 && (
          <p className={styles.itemPrep}>Avg. make time: ~{prepMinutes(item)} min</p>
        )}
        <TextField
          fullWidth
          multiline
          minRows={2}
          size="small"
          label="Item notes"
          placeholder="e.g. less sugar, no chilli"
          value={itemNote}
          onChange={(e) => setItemNote(e.target.value)}
          inputProps={{ maxLength: 500 }}
          sx={{ mt: 1 }}
        />
        <div className={styles.itemQuantityRow}>
          <div>
            <strong>Quantity</strong>
            <span>How many of this item?</span>
          </div>
          <div className={styles.itemQuantityControl}>
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={quantity <= 1}
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
            >
              <FaMinus size={11} />
            </button>
            <span>{quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQuantity((current) => Math.min(99, current + 1))}
            >
              <FaPlus size={11} />
            </button>
          </div>
        </div>
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={confirm} sx={{ textTransform: 'none' }}>
          Add {quantity} to order
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ItemNoteDialog({ item, onClose, onSave }) {
  const [itemNote, setItemNote] = useState(item?.itemNote ?? '');
  if (!item) return null;

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Edit notes for {item.name}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          size="small"
          label="Item notes"
          placeholder="e.g. less sugar, sauce on the side"
          value={itemNote}
          onChange={(e) => setItemNote(e.target.value)}
          inputProps={{ maxLength: 500 }}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(itemNote.trim())} sx={{ textTransform: 'none' }}>
          Save notes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PaymentDialog({ total, placing, onClose, onConfirm }) {
  const [paymentMethod, setPaymentMethod] = useState('');

  return (
    <Dialog open onClose={placing ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>How did the customer pay?</DialogTitle>
      <DialogContent>
        <p className={styles.paymentPrompt}>Select a payment type to keep this sale accurately recorded.</p>
        <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          {PAYMENT_METHODS.map((method) => {
            const MethodIcon = method.icon;
            return (
              <label
                key={method.value}
                className={`${styles.paymentChoice} ${paymentMethod === method.value ? styles.paymentChoiceSelected : ''}`}
              >
                <Radio value={method.value} size="small" />
                {method.image ? (
                  <Image
                    src={method.image}
                    alt={`${method.label} logo`}
                    width={56}
                    height={40}
                    className={styles.paymentLogo}
                  />
                ) : (
                  <MethodIcon className={styles.paymentIcon} />
                )}
                <span>
                  <strong>{method.label}</strong>
                  <small>{method.description}</small>
                </span>
              </label>
            );
          })}
        </RadioGroup>
        <div className={styles.paymentTotal}>
          <span>Order total</span>
          <strong>${total.toFixed(2)}</strong>
        </div>
      </DialogContent>
      <DialogActions>
        <Button disabled={placing} onClick={onClose} sx={{ textTransform: 'none' }}>Back</Button>
        <Button
          variant="contained"
          disabled={!paymentMethod || placing}
          onClick={() => onConfirm(paymentMethod)}
          startIcon={placing ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ textTransform: 'none' }}
        >
          {placing ? 'Placing…' : 'Confirm & place order'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── New Order (POS) ─────────────────────────────────────────────────────────
function NewOrderTab({ shopId, onPlaced }) {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [optionGroupsLibrary, setOptionGroupsLibrary] = useState([]);
  const [prepBufferMinutes, setPrepBufferMinutes] = useState(5);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [orderType, setOrderType] = useState('takeaway');
  const [selectedCat, setSelectedCat] = useState('all');
  const [cart, setCart] = useState([]); // { cartItemId, itemId, name, quantity, selectedOptionIds, optionNames, unitPrice, itemNote }
  const [notes, setNotes] = useState('');
  // Pre-order: optionally schedule the pickup for a future date/time.
  const [scheduleLater, setScheduleLater] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(() => dayjs().add(1, 'day').hour(12).minute(0).second(0));
  const [optionItemId, setOptionItemId] = useState(null);
  const [noteItemId, setNoteItemId] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [soldOutBusy, setSoldOutBusy] = useState(null);
  const [optionSoldOutBusy, setOptionSoldOutBusy] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [msg, setMsg] = useState(null); // { type, text }

  const itemsById = useMemo(() => {
    const m = {};
    for (const it of items) m[String(it.id)] = it;
    return m;
  }, [items]);

  // Derived from items so option sold-out toggles inside the dialog stay live.
  const optionItem = optionItemId ? (itemsById[String(optionItemId)] ?? null) : null;

  const itemGroups = useCallback((item) => groupsForItem(item, optionGroupsLibrary), [optionGroupsLibrary]);

  const loadMenu = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setLoadError('');
    try {
      const res = await apiClient.get(`${MENU}?shop_id=${shopId}`);
      const data = res.data?.data ?? {};
      setCategories(Array.isArray(data.categories) ? data.categories : []);
      setItems(Array.isArray(data.items) ? data.items : []);
      setOptionGroupsLibrary(Array.isArray(data.optionGroupsLibrary) ? data.optionGroupsLibrary : []);
      const rawBuffer = Number(data.prepBufferMinutes);
      setPrepBufferMinutes(Number.isFinite(rawBuffer) && rawBuffer >= 0 ? rawBuffer : 5);
    } catch {
      setLoadError('Failed to load your menu.');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  // Recompute cart unit prices when the order type changes.
  useEffect(() => {
    setCart((prev) => prev.map((c) => {
      const it = itemsById[String(c.itemId)];
      if (!it) return c;
      const { unitPrice } = computeUnit(it, orderType, c.selectedOptionIds, itemGroups(it));
      return { ...c, unitPrice };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderType]);

  const addToCart = (item, selectedOptionIds, unitPrice, optionNames, itemNote = '', quantity = 1) => {
    const key = cartKey(item.id, selectedOptionIds, itemNote);
    setCart((prev) => {
      const existing = prev.find((c) => c.cartItemId === key);
      if (existing) return prev.map((c) => (c.cartItemId === key ? { ...c, quantity: c.quantity + quantity } : c));
      return [...prev, {
        cartItemId: key,
        itemId: item.id,
        name: item.name,
        quantity,
        selectedOptionIds,
        optionNames,
        unitPrice,
        itemNote,
      }];
    });
  };

  const handleAddItem = (item) => {
    if (item.soldOut) return;
    setOptionItemId(item.id);
  };

  const changeQty = (cartItemId, delta) => {
    setCart((prev) =>
      prev
        .map((c) => (c.cartItemId === cartItemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const updateItemNote = (cartItemId, itemNote) => {
    setCart((prev) => {
      const target = prev.find((c) => c.cartItemId === cartItemId);
      if (!target) return prev;
      const nextId = cartKey(target.itemId, target.selectedOptionIds, itemNote);
      const duplicate = prev.find((c) => c.cartItemId === nextId && c.cartItemId !== cartItemId);
      if (duplicate) {
        return prev
          .filter((c) => c.cartItemId !== cartItemId)
          .map((c) => (c.cartItemId === nextId ? { ...c, quantity: c.quantity + target.quantity } : c));
      }
      return prev.map((c) => (c.cartItemId === cartItemId ? { ...c, cartItemId: nextId, itemNote } : c));
    });
    setNoteItemId(null);
  };

  const toggleSoldOut = async (item) => {
    const next = !item.soldOut;
    setSoldOutBusy(item.id);
    // optimistic
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, soldOut: next } : i)));
    try {
      await apiClient.put(MENU_SOLD_OUT, { itemId: item.id, soldOut: next });
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, soldOut: !next } : i))); // revert
      setMsg({ type: 'error', text: 'Could not update sold-out status.' });
    } finally {
      setSoldOutBusy(null);
    }
  };

  // Option groups are shared, so a sold-out option is patched in the library and in
  // every item's embedded copy of the group.
  const patchOptionSoldOut = (groupId, optionId, value) => {
    const patchGroups = (groups) => (groups ?? []).map((g) => (
      String(g.id) === String(groupId)
        ? { ...g, options: (g.options ?? []).map((o) => (String(o.id) === String(optionId) ? { ...o, soldOut: value } : o)) }
        : g
    ));
    setItems((prev) => prev.map((it) => (
      (it.optionGroups ?? []).some((g) => String(g.id) === String(groupId))
        ? { ...it, optionGroups: patchGroups(it.optionGroups) }
        : it
    )));
    setOptionGroupsLibrary((prev) => patchGroups(prev));
  };

  const toggleOptionSoldOut = async (group, option) => {
    const next = !option.soldOut;
    setOptionSoldOutBusy(option.id);
    patchOptionSoldOut(group.id, option.id, next); // optimistic
    try {
      await apiClient.put(MENU_SOLD_OUT, { groupId: group.id, optionId: option.id, soldOut: next });
    } catch {
      patchOptionSoldOut(group.id, option.id, !next); // revert
      setMsg({ type: 'error', text: 'Could not update option sold-out status.' });
    } finally {
      setOptionSoldOutBusy(null);
    }
  };

  const subtotal = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);

  // Waiting-time estimate: shop buffer + avg make time × quantity across the cart
  // (matches how the backend stamps estimated_ready_at on the order).
  const estPrepMinutes = cart.length
    ? prepBufferMinutes + cart.reduce((s, c) => s + prepMinutes(itemsById[String(c.itemId)]) * c.quantity, 0)
    : 0;

  const requestPayment = () => {
    if (cart.length === 0) return;
    if (scheduleLater && !scheduledAt.isAfter(dayjs())) {
      setMsg({ type: 'error', text: 'The scheduled pickup time must be in the future.' });
      return;
    }
    setMsg(null);
    setPaymentOpen(true);
  };

  const placeOrder = async (paymentMethod) => {
    setPlacing(true);
    setMsg(null);
    try {
      const res = await apiClient.post(WALK_IN_ORDER, {
        orderType,
        paymentMethod,
        notes,
        scheduledFor: scheduleLater ? scheduledAt.toISOString() : undefined,
        items: cart.map((c) => ({
          itemId: c.itemId,
          quantity: c.quantity,
          notes: c.itemNote,
          selectedOptions: c.selectedOptionIds.map((optionId) => ({ optionId })),
        })),
      });
      setPaymentOpen(false);
      setCart([]);
      setNotes('');
      setScheduleLater(false);
      const queueNumber = res.data?.data?.queueNumber;
      const scheduledFor = res.data?.data?.scheduledFor;
      const queuePart = queueNumber != null ? ` — queue Q${queueNumber}` : '';
      setMsg({
        type: 'success',
        text: scheduledFor
          ? `Pre-order placed for ${dayjs(scheduledFor).format('ddd D MMM, h:mm A')}${queuePart}.`
          : queueNumber != null
            ? `Order placed — queue number Q${queueNumber}.`
            : 'Order placed — added to the queue.',
      });
      onPlaced?.();
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.message || 'Could not place the order.' });
    } finally {
      setPlacing(false);
    }
  };

  // Category chips (with counts) + the items shown for the selected category.
  const catChips = useMemo(() => {
    const used = new Set();
    const chips = [{ id: 'all', name: 'All', count: items.length }];
    for (const cat of categories) {
      const inCat = items.filter((it) => (it.categoryIds ?? []).includes(cat.id));
      inCat.forEach((it) => used.add(it.id));
      if (inCat.length) chips.push({ id: cat.id, name: cat.name, count: inCat.length });
    }
    const otherCount = items.filter((it) => !used.has(it.id)).length;
    if (otherCount) chips.push({ id: '__other', name: 'Other', count: otherCount });
    return chips;
  }, [categories, items]);

  const shownItems = useMemo(() => {
    if (selectedCat === 'all') return items;
    if (selectedCat === '__other') {
      const inAny = new Set();
      for (const cat of categories) items.forEach((it) => { if ((it.categoryIds ?? []).includes(cat.id)) inAny.add(it.id); });
      return items.filter((it) => !inAny.has(it.id));
    }
    return items.filter((it) => (it.categoryIds ?? []).includes(selectedCat));
  }, [items, categories, selectedCat]);

  if (loading) return <div className={styles.loading}><CircularProgress size={24} /></div>;
  if (loadError) return <ContentCard><p className={styles.empty}>{loadError}</p></ContentCard>;
  if (items.length === 0) {
    return <ContentCard><p className={styles.empty}>No menu items yet. Add items in Menu Builder first.</p></ContentCard>;
  }

  return (
    <div className={styles.posLayout}>
      <div className={styles.menuCol}>
        <div className={styles.orderTypeRow}>
          <RadioGroup row value={orderType} onChange={(e) => setOrderType(e.target.value)}>
            <FormControlLabel value="takeaway" control={<Radio size="small" />} label="Takeaway" />
            <FormControlLabel value="dine-in" control={<Radio size="small" />} label="Dine-in" />
          </RadioGroup>
        </div>

        <div className={styles.catChips}>
          {catChips.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`${styles.catChip} ${selectedCat === c.id ? styles.catChipActive : ''}`}
              onClick={() => setSelectedCat(c.id)}
            >
              {c.name}
              <span className={styles.catCount}>{c.count}</span>
            </button>
          ))}
        </div>

        <div className={styles.itemGrid}>
          {shownItems.map((it) => (
            <div key={it.id} className={`${styles.itemCard} ${it.soldOut ? styles.itemSoldOut : ''}`}>
              <button type="button" className={styles.itemMain} disabled={it.soldOut} onClick={() => handleAddItem(it)}>
                {it.photo?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.photo.url} alt={it.name} className={styles.itemImg} />
                ) : (
                  <div className={styles.itemImgPh}>🍽️</div>
                )}
                <span className={styles.itemNm}>{it.name}</span>
                <span className={styles.itemPr}>${basePrice(it, orderType).toFixed(2)}</span>
                {prepMinutes(it) > 0 && <span className={styles.itemPrep}>~{prepMinutes(it)} min</span>}
                {it.soldOut && <span className={styles.soldBadge}>Sold out</span>}
              </button>
              <label className={styles.soldOutToggle}>
                <Switch size="small" checked={!!it.soldOut} disabled={soldOutBusy === it.id} onChange={() => toggleSoldOut(it)} />
                <span>Sold out</span>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.cartCol}>
        <ContentCard className={styles.cartCard}>
          <h3 className={styles.cartTitle}>Current order</h3>
          {cart.length === 0 ? (
            <p className={styles.cartEmpty}>Tap menu items to add them.</p>
          ) : (
            <div className={styles.cartList}>
              {cart.map((c) => (
                <div key={c.cartItemId} className={styles.cartItem}>
                  <button type="button" className={styles.cartItemInfo} onClick={() => setNoteItemId(c.cartItemId)}>
                    <span className={styles.cartItemName}>{c.name}</span>
                    {c.optionNames.length > 0 && <span className={styles.cartItemOpts}>{c.optionNames.join(', ')}</span>}
                    {c.itemNote ? (
                      <span className={styles.cartItemNote}>Note: {c.itemNote}</span>
                    ) : (
                      <span className={styles.addItemNote}>+ Add item notes</span>
                    )}
                    <span className={styles.cartItemPrice}>${(c.unitPrice * c.quantity).toFixed(2)}</span>
                  </button>
                  <div className={styles.qty}>
                    <button type="button" onClick={() => changeQty(c.cartItemId, -1)}><FaMinus size={10} /></button>
                    <span>{c.quantity}</span>
                    <button type="button" onClick={() => changeQty(c.cartItemId, 1)}><FaPlus size={10} /></button>
                    <button type="button" className={styles.removeBtn} onClick={() => changeQty(c.cartItemId, -c.quantity)}><FaTrashAlt size={11} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <TextField
            size="small"
            placeholder="Notes (e.g. table 5, no chilli)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            sx={{ mt: 1.5 }}
          />

          <FormControlLabel
            sx={{ mt: 1 }}
            control={<Switch size="small" checked={scheduleLater} onChange={(e) => setScheduleLater(e.target.checked)} />}
            label="Schedule for later (pre-order)"
          />

          {scheduleLater && (
            <div className={styles.scheduleRow}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  value={scheduledAt}
                  onChange={(v) => {
                    if (!v) return;
                    setScheduledAt((prev) => v.hour(prev.hour()).minute(prev.minute()).second(0));
                  }}
                  disablePast
                  format="DD MMM YYYY"
                  slotProps={{ textField: { size: 'small', sx: { flex: 1, minWidth: 150 } } }}
                />
              </LocalizationProvider>
              <TextField
                type="time"
                size="small"
                label="Pickup time"
                value={scheduledAt.format('HH:mm')}
                onChange={(e) => {
                  const [hh, mm] = String(e.target.value).split(':').map(Number);
                  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return;
                  setScheduledAt((prev) => prev.hour(hh).minute(mm).second(0));
                }}
                inputProps={{ step: 60 }}
                sx={{ width: 130 }}
              />
            </div>
          )}

          {!scheduleLater && estPrepMinutes > 0 && (
            <div className={styles.cartEtaRow}>
              <span>Est. waiting time</span>
              <strong>~{estPrepMinutes} min</strong>
            </div>
          )}

          <div className={styles.cartTotalRow}>
            <span>Total</span>
            <strong>${subtotal.toFixed(2)}</strong>
          </div>

          {msg && <Alert severity={msg.type} onClose={() => setMsg(null)} sx={{ mt: 1 }}>{msg.text}</Alert>}

          <Button
            variant="contained"
            fullWidth
            disabled={cart.length === 0 || placing}
            onClick={requestPayment}
            sx={{ mt: 1.5, textTransform: 'none', py: 1.3, fontSize: '1rem', fontWeight: 700 }}
          >
            Place Order
          </Button>
        </ContentCard>
      </div>

      {optionItem && (
        <OptionDialog
          item={optionItem}
          groups={itemGroups(optionItem)}
          orderType={orderType}
          onClose={() => setOptionItemId(null)}
          onConfirm={({ selectedOptionIds, unitPrice, optionNames, itemNote, quantity }) => {
            addToCart(optionItem, selectedOptionIds, unitPrice, optionNames, itemNote, quantity);
            setOptionItemId(null);
          }}
          onToggleOptionSoldOut={toggleOptionSoldOut}
          optionSoldOutBusy={optionSoldOutBusy}
        />
      )}

      {noteItemId && (
        <ItemNoteDialog
          item={cart.find((c) => c.cartItemId === noteItemId)}
          onClose={() => setNoteItemId(null)}
          onSave={(itemNote) => updateItemNote(noteItemId, itemNote)}
        />
      )}

      {paymentOpen && (
        <PaymentDialog
          total={subtotal}
          placing={placing}
          onClose={() => setPaymentOpen(false)}
          onConfirm={placeOrder}
        />
      )}
    </div>
  );
}

// ── Orders (manage by date + status) ────────────────────────────────────────
function OrdersTab({ onChanged }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => dayjs());
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [undoTarget, setUndoTarget] = useState(null); // order being undone
  const [etaTarget, setEtaTarget] = useState(null); // order whose est. time is edited
  const [cancelTarget, setCancelTarget] = useState(null); // order being cancelled
  const [delayMinutes, setDelayMinutes] = useState(10);
  const [delayBusy, setDelayBusy] = useState(false);

  const dateRef = useRef(selectedDate);
  dateRef.current = selectedDate;
  const dayKey = selectedDate.format('YYYY-MM-DD');

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const d = dateRef.current;
      const res = await apiClient.get(SHOP_ORDERS, {
        params: { from: d.startOf('day').toISOString(), to: d.endOf('day').toISOString() },
      });
      setOrders(res.data?.data ?? []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load orders.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [dayKey, fetchOrders]);
  useEffect(() => {
    const id = setInterval(() => fetchOrders(true), 30000);
    return () => clearInterval(id);
  }, [fetchOrders]);

  const setStatus = async (order, status) => {
    setBusyId(order.id);
    setError('');
    try {
      await apiClient.put(`${SHOP_ORDERS}/${order.id}/status`, { status });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
      onChanged?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update order.');
    } finally {
      setBusyId(null);
    }
  };

  const cancelOrder = async (order, reason) => {
    setBusyId(order.id);
    setError('');
    try {
      await apiClient.put(`${SHOP_ORDERS}/${order.id}/status`, { status: 'cancelled', reason });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: 'cancelled' } : o)));
      setCancelTarget(null);
      onChanged?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmPayment = async (order) => {
    setBusyId(order.id);
    try {
      await apiClient.post(`${SHOP_ORDERS}/${order.id}/confirm-payment`);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, payment_status: 'paid' } : o)));
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to confirm payment.');
    } finally {
      setBusyId(null);
    }
  };

  const undoStatus = async (order, reason) => {
    setBusyId(order.id);
    setError('');
    try {
      const res = await apiClient.post(`${SHOP_ORDERS}/${order.id}/undo-status`, { reason });
      const status = res.data?.data?.status;
      if (status) setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
      setUndoTarget(null);
      onChanged?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to undo order status.');
    } finally {
      setBusyId(null);
    }
  };

  const saveEta = async (order, estimatedReadyAt) => {
    setBusyId(order.id);
    setError('');
    try {
      await apiClient.put(`${SHOP_ORDERS}/${order.id}/estimated-ready`, { estimatedReadyAt });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, estimated_ready_at: estimatedReadyAt } : o)));
      setEtaTarget(null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update estimated time.');
    } finally {
      setBusyId(null);
    }
  };

  // Shift every active order of the selected day by ± minutes (rush / catch-up).
  const delayAll = async () => {
    const minutes = Number(delayMinutes);
    if (!Number.isFinite(minutes) || minutes === 0) return;
    setDelayBusy(true);
    setError('');
    try {
      const d = dateRef.current;
      await apiClient.post(`${SHOP_ORDERS}/delay-all`, {
        minutes,
        from: d.startOf('day').toISOString(),
        to: d.endOf('day').toISOString(),
      });
      await fetchOrders(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to shift orders.');
    } finally {
      setDelayBusy(false);
    }
  };

  // Daily queue numbers: 1-based position within the day's orders by creation time.
  // Computed from the full (unfiltered) day so numbers stay stable across filters.
  const queueNumberById = useMemo(() => {
    const sorted = [...orders].sort((a, b) => {
      const d = new Date(a.created_at) - new Date(b.created_at);
      return d !== 0 ? d : String(a.id).localeCompare(String(b.id));
    });
    const m = {};
    sorted.forEach((o, i) => { m[o.id] = i + 1; });
    return m;
  }, [orders]);

  const filtered = useMemo(() => {
    const sf = STATUS_FILTERS.find((f) => f.key === statusFilter);
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (sf?.match && !sf.match(o.status)) return false;
      if (q) {
        const hay = `q${queueNumberById[o.id]} ${orderRef(o.id)} ${(o.items || []).map((i) => i.name).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, search, queueNumberById]);

  return (
    <div className={styles.ordersWrap}>
      <div className={styles.ordersFilters}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            value={selectedDate}
            onChange={(v) => v && setSelectedDate(v)}
            disableFuture
            format="DD MMM YYYY"
            slotProps={{ textField: { size: 'small', className: styles.datePicker } }}
          />
        </LocalizationProvider>
        <Select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.statusSelect}>
          {STATUS_FILTERS.map((f) => (<MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>))}
        </Select>
        <TextField size="small" placeholder="Search ref or item…" value={search} onChange={(e) => setSearch(e.target.value)} className={styles.search} />
        <Button size="small" variant="outlined" startIcon={<FaSync />} onClick={() => fetchOrders()} sx={{ textTransform: 'none' }}>Refresh</Button>
        <div className={styles.delayAll}>
          <TextField
            size="small"
            type="number"
            label="± min"
            value={delayMinutes}
            onChange={(e) => setDelayMinutes(Number(e.target.value))}
            inputProps={{ step: 5, min: -240, max: 240 }}
            sx={{ width: 90 }}
          />
          <Button
            size="small"
            variant="outlined"
            disabled={delayBusy || !Number(delayMinutes)}
            onClick={delayAll}
            startIcon={delayBusy ? <CircularProgress size={12} color="inherit" /> : null}
            sx={{ textTransform: 'none' }}
            title="Shift the estimated time of every active order on this day"
          >
            Apply to all active
          </Button>
        </div>
      </div>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <div className={styles.loading}><CircularProgress size={24} /></div>
      ) : filtered.length === 0 ? (
        <ContentCard><p className={styles.empty}>No orders on this day.</p></ContentCard>
      ) : (
        <div className={styles.orderGrid}>
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              queueNumber={queueNumberById[order.id]}
              busy={busyId === order.id}
              onSetStatus={setStatus}
              onConfirmPayment={confirmPayment}
              onViewScreenshot={(o) => setScreenshot({ url: o.screenshot_signed_url, ref: orderRef(o.id) })}
              onUndoStatus={(o) => setUndoTarget(o)}
              onEditEta={(o) => setEtaTarget(o)}
              onCancel={(o) => setCancelTarget(o)}
            />
          ))}
        </div>
      )}

      {undoTarget && (
        <UndoStatusDialog
          order={undoTarget}
          busy={busyId === undoTarget.id}
          onClose={() => setUndoTarget(null)}
          onConfirm={undoStatus}
        />
      )}

      {etaTarget && (
        <EditEtaDialog
          order={etaTarget}
          busy={busyId === etaTarget.id}
          onClose={() => setEtaTarget(null)}
          onConfirm={saveEta}
        />
      )}

      {cancelTarget && (
        <CancelOrderDialog
          order={cancelTarget}
          busy={busyId === cancelTarget.id}
          onClose={() => setCancelTarget(null)}
          onConfirm={cancelOrder}
        />
      )}

      <Dialog open={!!screenshot} onClose={() => setScreenshot(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 1 }}>
          <span>Payment screenshot {screenshot?.ref}</span>
          <IconButton size="small" onClick={() => setScreenshot(null)} aria-label="close"><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          {screenshot?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={screenshot.url} alt="Payment screenshot" className={styles.screenshotFull} />
          ) : (
            <Alert severity="info">No screenshot available.</Alert>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const format12h = (hhmm) => {
  const [hh, mm] = String(hhmm ?? '').split(':').map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return String(hhmm ?? '');
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, '0')} ${suffix}`;
};

// ── Pre-orders (forward-looking prep view) ──────────────────────────────────
const PREORDER_ACTIVE = ['pending', 'sent', 'preparing', 'ready'];

function PreOrdersTab({ onChanged }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPreorders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const from = dayjs().startOf('day');
      const to = dayjs().add(90, 'day').endOf('day');
      const res = await apiClient.get(SHOP_ORDERS, {
        params: { from: from.toISOString(), to: to.toISOString() },
      });
      const all = res.data?.data ?? [];
      // Only scheduled (pre-)orders that are still active.
      setOrders(all.filter((o) => o.scheduled_for && PREORDER_ACTIVE.includes(o.status)));
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load pre-orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPreorders(); }, [fetchPreorders]);

  const todayKey = dayjs().format('YYYY-MM-DD');

  // Aggregate item quantities across today's pre-orders → batch cook list.
  const todayPrep = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      if (dayjs(o.scheduled_for).format('YYYY-MM-DD') !== todayKey) continue;
      for (const it of (o.items ?? [])) {
        const opts = Array.isArray(it.options) && it.options.length ? ` (${it.options.join(', ')})` : '';
        const label = `${it.name}${opts}`;
        map.set(label, (map.get(label) ?? 0) + (Number(it.quantity) || 1));
      }
    }
    return [...map.entries()].map(([label, qty]) => ({ label, qty })).sort((a, b) => b.qty - a.qty);
  }, [orders, todayKey]);

  // Group upcoming pre-orders by pickup day, numbered within each day.
  const groups = useMemo(() => {
    const byDay = new Map();
    for (const o of orders) {
      const key = dayjs(o.scheduled_for).format('YYYY-MM-DD');
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(o);
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, list]) => ({
        key,
        label: dayjs(key).format('dddd, D MMM YYYY'),
        isToday: key === todayKey,
        orders: list.sort((a, b) => dayjs(a.scheduled_for) - dayjs(b.scheduled_for)),
      }));
  }, [orders, todayKey]);

  if (loading) return <div className={styles.loading}><CircularProgress size={24} /></div>;

  return (
    <div className={styles.preorderWrap}>
      <div className={styles.preorderHead}>
        <p className={styles.preorderSub}>Upcoming scheduled orders. Manage each one (status, cancel, ETA) from the Orders tab on its pickup day.</p>
        <Button size="small" variant="outlined" startIcon={<FaSync />} onClick={fetchPreorders} sx={{ textTransform: 'none' }}>Refresh</Button>
      </div>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {todayPrep.length > 0 && (
        <ContentCard className={styles.prepCard}>
          <h3 className={styles.prepTitle}>Today&apos;s prep list</h3>
          <p className={styles.prepHint}>Total quantities to make across today&apos;s pre-orders.</p>
          <div className={styles.prepList}>
            {todayPrep.map((p) => (
              <div key={p.label} className={styles.prepRow}>
                <span className={styles.prepQty}>×{p.qty}</span>
                <span className={styles.prepName}>{p.label}</span>
              </div>
            ))}
          </div>
        </ContentCard>
      )}

      {groups.length === 0 ? (
        <ContentCard><p className={styles.empty}>No upcoming pre-orders.</p></ContentCard>
      ) : (
        groups.map((g) => (
          <div key={g.key} className={styles.preorderGroup}>
            <div className={styles.preorderDay}>
              {g.label}{g.isToday ? <span className={styles.todayTag}>Today</span> : null}
              <span className={styles.preorderCount}>{g.orders.length} order{g.orders.length === 1 ? '' : 's'}</span>
            </div>
            {g.orders.map((o, idx) => {
              const items = Array.isArray(o.items) ? o.items : [];
              return (
                <div key={o.id} className={styles.preorderRow}>
                  <div className={styles.preorderTime}>
                    <span className={styles.preorderQ}>#{idx + 1}</span>
                    {dayjs(o.scheduled_for).format('h:mm A')}
                  </div>
                  <div className={styles.preorderItems}>
                    {items.map((it, i) => (
                      <div key={i} className={styles.preorderItem}>
                        {it.quantity}× {it.name}
                        {Array.isArray(it.options) && it.options.length > 0 && (
                          <span className={styles.preorderOpts}> ({it.options.join(', ')})</span>
                        )}
                        {it.notes && <span className={styles.preorderItemNote}> — {it.notes}</span>}
                      </div>
                    ))}
                    {o.notes ? <div className={styles.preorderNote}>Note: {o.notes}</div> : null}
                  </div>
                  <div className={styles.preorderMeta}>
                    <span className={styles.preorderStatus}>{o.status}</span>
                    <span className={styles.preorderTotal}>${Number(o.total ?? 0).toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

export default function TerminalPage() {
  const [tab, setTab] = useState('new');
  const [shopId, setShopId] = useState(null);
  const [shopOpen, setShopOpen] = useState(null); // manual flag (drives the switch)
  const [shopStatus, setShopStatus] = useState(null); // composed status incl. hours + calendar
  const [openBusy, setOpenBusy] = useState(false);
  const [todayIncomplete, setTodayIncomplete] = useState(0);

  useEffect(() => {
    setShopId(getUserDataFromCookie()?.shop_id ?? null);
    apiClient.get(SHOP_OPEN)
      .then((res) => {
        const d = res.data?.data ?? {};
        setShopOpen(d.isOpen ?? true);
        setShopStatus(d);
      })
      .catch(() => setShopOpen(true));
  }, []);

  // Today's incomplete orders → the Orders tab badge.
  const fetchTodayCount = useCallback(async () => {
    try {
      const today = dayjs();
      const res = await apiClient.get(SHOP_ORDERS, {
        params: { from: today.startOf('day').toISOString(), to: today.endOf('day').toISOString() },
      });
      const orders = res.data?.data ?? [];
      setTodayIncomplete(orders.filter((o) => !['completed', 'cancelled', 'expired'].includes(o.status)).length);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchTodayCount();
    const id = setInterval(fetchTodayCount, 30000);
    return () => clearInterval(id);
  }, [fetchTodayCount]);

  const toggleOpen = async (next) => {
    setOpenBusy(true);
    const prev = shopOpen;
    setShopOpen(next);
    try {
      await apiClient.put(SHOP_OPEN, { isOpen: next });
      setShopStatus((s) => (s ? { ...s, isOpen: next, effectiveOpen: next && s.withinHours && !s.calendarClosed } : s));
    } catch {
      setShopOpen(prev); // revert
    } finally {
      setOpenBusy(false);
    }
  };

  // Composed status: manual flag ∧ ordering hours ∧ today's calendar override.
  const effectiveOpen = shopStatus ? shopStatus.effectiveOpen !== false : shopOpen !== false;
  let statusLabel = 'Shop Open';
  if (shopOpen === false) {
    statusLabel = 'Shop Closed';
  } else if (shopStatus?.calendarClosed) {
    statusLabel = `Closed today — calendar${shopStatus.calendarReason ? ` (${shopStatus.calendarReason})` : ''}`;
  } else if (shopStatus && !shopStatus.withinHours) {
    statusLabel = shopStatus.hoursToday?.enabled
      ? `Outside ordering hours (${format12h(shopStatus.hoursToday.open)}–${format12h(shopStatus.hoursToday.close)})`
      : 'Closed today — ordering hours';
  }

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <div className={styles.topLeft}>
          <Link href="/app" className={styles.backBtn} aria-label="Back to dashboard">
            <FaArrowLeft size={14} />
          </Link>
          <div>
            <h1 className={styles.topTitle}>Terminal / POS</h1>
            <p className={styles.topSub}>Walk-in orders &amp; today&apos;s queue</p>
          </div>
        </div>
        <div className={`${styles.shopStatus} ${effectiveOpen ? styles.statusOpen : styles.statusClosed}`}>
          <span className={styles.statusDot} />
          <span className={styles.statusLabel}>{statusLabel}</span>
          <Switch
            size="small"
            checked={shopOpen !== false}
            disabled={shopOpen === null || openBusy}
            onChange={(e) => toggleOpen(e.target.checked)}
          />
        </div>
      </header>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} className={styles.tabs}>
        <Tab value="new" label="New Order" sx={{ textTransform: 'none', fontWeight: 700 }} />
        <Tab value="orders" label={`Orders (${todayIncomplete})`} sx={{ textTransform: 'none', fontWeight: 700 }} />
        <Tab value="preorders" label="Pre-orders" sx={{ textTransform: 'none', fontWeight: 700 }} />
      </Tabs>

      {tab === 'new' && <NewOrderTab shopId={shopId} onPlaced={fetchTodayCount} />}
      {tab === 'orders' && <OrdersTab onChanged={fetchTodayCount} />}
      {tab === 'preorders' && <PreOrdersTab onChanged={fetchTodayCount} />}
    </div>
  );
}
