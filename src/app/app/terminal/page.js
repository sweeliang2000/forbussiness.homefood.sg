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
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Link from 'next/link';
import { FaSync, FaPlus, FaMinus, FaTrashAlt, FaArrowLeft } from 'react-icons/fa';
import styles from './page.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import apiClient from '@/utility/api';
import { getUserDataFromCookie } from '@/utility/cookieUtils';
import { MENU, WALK_IN_ORDER, MENU_SOLD_OUT, SHOP_OPEN, SHOP_ORDERS } from '@/utility/apiPaths';
import { OrderCard, STATUS_FILTERS, orderRef } from '../order-queue/_views/OrderCard';

const basePrice = (item, orderType) =>
  Number(orderType === 'dine-in' ? (item.dineInBasePrice ?? item.dineInPrice ?? 0) : (item.takeawayBasePrice ?? 0)) || 0;

function computeUnit(item, orderType, selectedOptionIds) {
  let price = basePrice(item, orderType);
  const optionNames = [];
  for (const g of item.optionGroups ?? []) {
    for (const o of g.options ?? []) {
      if (selectedOptionIds.includes(String(o.id))) {
        price += Number(o.additionalPrice) || 0;
        optionNames.push(o.name);
      }
    }
  }
  return { unitPrice: price, optionNames };
}

const cartKey = (itemId, optionIds) => `${itemId}__${[...optionIds].sort().join('-')}`;

// ── Option-picker dialog ────────────────────────────────────────────────────
function OptionDialog({ item, orderType, onClose, onConfirm }) {
  const [sel, setSel] = useState({}); // groupId -> [optionId]
  const [error, setError] = useState('');

  if (!item) return null;
  const groups = item.optionGroups ?? [];

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
    for (const g of groups) {
      const n = (sel[g.id] ?? []).length;
      if (g.required && n === 0) {
        setError(`Please choose an option for "${g.name}".`);
        return;
      }
    }
    const selectedOptionIds = Object.values(sel).flat().map(String);
    const { unitPrice, optionNames } = computeUnit(item, orderType, selectedOptionIds);
    onConfirm({ selectedOptionIds, unitPrice, optionNames });
  };

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
                  <FormControlLabel key={o.id} value={String(o.id)} control={<Radio size="small" />}
                    label={`${o.name}${o.additionalPrice > 0 ? ` +$${Number(o.additionalPrice).toFixed(2)}` : ''}`} />
                ))}
              </RadioGroup>
            ) : (
              (g.options ?? []).map((o) => (
                <FormControlLabel key={o.id}
                  control={<Checkbox size="small" checked={(sel[g.id] ?? []).includes(String(o.id))} onChange={() => toggle(g, String(o.id))} />}
                  label={`${o.name}${o.additionalPrice > 0 ? ` +$${Number(o.additionalPrice).toFixed(2)}` : ''}`} />
              ))
            )}
          </div>
        ))}
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={confirm} sx={{ textTransform: 'none' }}>Add to order</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── New Order (POS) ─────────────────────────────────────────────────────────
function NewOrderTab({ shopId, onPlaced }) {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [orderType, setOrderType] = useState('takeaway');
  const [selectedCat, setSelectedCat] = useState('all');
  const [cart, setCart] = useState([]); // { cartItemId, itemId, name, quantity, selectedOptionIds, optionNames, unitPrice }
  const [notes, setNotes] = useState('');
  const [optionItem, setOptionItem] = useState(null);
  const [soldOutBusy, setSoldOutBusy] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [msg, setMsg] = useState(null); // { type, text }

  const itemsById = useMemo(() => {
    const m = {};
    for (const it of items) m[String(it.id)] = it;
    return m;
  }, [items]);

  const loadMenu = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setLoadError('');
    try {
      const res = await apiClient.get(`${MENU}?shop_id=${shopId}`);
      const data = res.data?.data ?? {};
      setCategories(Array.isArray(data.categories) ? data.categories : []);
      setItems(Array.isArray(data.items) ? data.items : []);
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
      const { unitPrice } = computeUnit(it, orderType, c.selectedOptionIds);
      return { ...c, unitPrice };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderType]);

  const addToCart = (item, selectedOptionIds, unitPrice, optionNames) => {
    const key = cartKey(item.id, selectedOptionIds);
    setCart((prev) => {
      const existing = prev.find((c) => c.cartItemId === key);
      if (existing) return prev.map((c) => (c.cartItemId === key ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { cartItemId: key, itemId: item.id, name: item.name, quantity: 1, selectedOptionIds, optionNames, unitPrice }];
    });
  };

  const handleAddItem = (item) => {
    if (item.soldOut) return;
    const hasOptions = (item.optionGroups ?? []).some((g) => (g.options ?? []).length > 0);
    if (hasOptions) {
      setOptionItem(item);
    } else {
      const { unitPrice, optionNames } = computeUnit(item, orderType, []);
      addToCart(item, [], unitPrice, optionNames);
    }
  };

  const changeQty = (cartItemId, delta) => {
    setCart((prev) =>
      prev
        .map((c) => (c.cartItemId === cartItemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
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

  const subtotal = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setPlacing(true);
    setMsg(null);
    try {
      await apiClient.post(WALK_IN_ORDER, {
        orderType,
        notes,
        items: cart.map((c) => ({
          itemId: c.itemId,
          quantity: c.quantity,
          selectedOptions: c.selectedOptionIds.map((optionId) => ({ optionId })),
        })),
      });
      setCart([]);
      setNotes('');
      setMsg({ type: 'success', text: 'Order placed — added to the queue.' });
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
                  <div className={styles.cartItemInfo}>
                    <span className={styles.cartItemName}>{c.name}</span>
                    {c.optionNames.length > 0 && <span className={styles.cartItemOpts}>{c.optionNames.join(', ')}</span>}
                    <span className={styles.cartItemPrice}>${(c.unitPrice * c.quantity).toFixed(2)}</span>
                  </div>
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

          <div className={styles.cartTotalRow}>
            <span>Total</span>
            <strong>${subtotal.toFixed(2)}</strong>
          </div>

          {msg && <Alert severity={msg.type} onClose={() => setMsg(null)} sx={{ mt: 1 }}>{msg.text}</Alert>}

          <Button
            variant="contained"
            fullWidth
            disabled={cart.length === 0 || placing}
            onClick={placeOrder}
            startIcon={placing ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ mt: 1.5, textTransform: 'none', py: 1.3, fontSize: '1rem', fontWeight: 700 }}
          >
            {placing ? 'Placing…' : 'Place Order · Paid'}
          </Button>
        </ContentCard>
      </div>

      {optionItem && (
        <OptionDialog
          item={optionItem}
          orderType={orderType}
          onClose={() => setOptionItem(null)}
          onConfirm={({ selectedOptionIds, unitPrice, optionNames }) => {
            addToCart(optionItem, selectedOptionIds, unitPrice, optionNames);
            setOptionItem(null);
          }}
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

  const filtered = useMemo(() => {
    const sf = STATUS_FILTERS.find((f) => f.key === statusFilter);
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (sf?.match && !sf.match(o.status)) return false;
      if (q) {
        const hay = `${orderRef(o.id)} ${(o.items || []).map((i) => i.name).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, search]);

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
              busy={busyId === order.id}
              onSetStatus={setStatus}
              onConfirmPayment={confirmPayment}
              onViewScreenshot={(o) => setScreenshot({ url: o.screenshot_signed_url, ref: orderRef(o.id) })}
            />
          ))}
        </div>
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

export default function TerminalPage() {
  const [tab, setTab] = useState('new');
  const [shopId, setShopId] = useState(null);
  const [shopOpen, setShopOpen] = useState(null);
  const [openBusy, setOpenBusy] = useState(false);
  const [todayIncomplete, setTodayIncomplete] = useState(0);

  useEffect(() => {
    setShopId(getUserDataFromCookie()?.shop_id ?? null);
    apiClient.get(SHOP_OPEN)
      .then((res) => setShopOpen(res.data?.data?.isOpen ?? true))
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
    } catch {
      setShopOpen(prev); // revert
    } finally {
      setOpenBusy(false);
    }
  };

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
        <div className={`${styles.shopStatus} ${shopOpen === false ? styles.statusClosed : styles.statusOpen}`}>
          <span className={styles.statusDot} />
          <span className={styles.statusLabel}>{shopOpen === false ? 'Shop Closed' : 'Shop Open'}</span>
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
      </Tabs>

      {tab === 'new' ? (
        <NewOrderTab shopId={shopId} onPlaced={fetchTodayCount} />
      ) : (
        <OrdersTab onChanged={fetchTodayCount} />
      )}
    </div>
  );
}
