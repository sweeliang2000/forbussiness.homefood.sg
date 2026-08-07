'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { FaCheck, FaLocationArrow, FaSearch, FaTruck } from 'react-icons/fa';
import SectionToggle from '@/components/App/SectionToggle/SectionToggle';
import {
  DELIVERY_REGIONS,
  REGION_LABELS,
  DEFAULT_ETA_MINUTES,
  MIN_ETA_MINUTES,
  MAX_ETA_MINUTES,
  quoteDelivery,
  resolveSector,
  formatFee,
  formatEta,
} from '@/utility/deliveryZones';
import styles from '../ShopSettings.module.css';

/** Areas listed under each region so a merchant knows what they're pricing. */
const REGION_HINTS = {
  north: 'Woodlands, Yishun, Sembawang, Ang Mo Kio, Bishan, Punggol, Sengkang',
  south: 'City, Marina, Tanjong Pagar, Orchard, Queenstown, Tiong Bahru',
  east: 'Bedok, Tampines, Pasir Ris, Changi, Geylang, Katong',
  west: 'Jurong, Clementi, Bukit Batok, Choa Chu Kang, Bukit Timah',
};

/** Keeps a money input editable while typing (so "" and "5." don't snap to 0). */
const clampFee = (raw) => {
  if (raw === '') return '';
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return '0';
  return String(Math.min(n, 200));
};

/** Same, for the waiting time. Held to the band the API validates against. */
const clampEta = (raw) => {
  if (raw === '') return '';
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return String(MIN_ETA_MINUTES);
  return String(Math.min(Math.round(n), MAX_ETA_MINUTES));
};

export default function DeliverySection({ delivery, setDelivery, disabled, expanded, onToggleExpand }) {
  const [testOpen, setTestOpen] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [showTerms, setShowTerms] = useState(false);

  const setField = (field, value) => setDelivery({ ...delivery, [field]: value });
  const setZoneFee = (region, value) =>
    setDelivery({ ...delivery, zoneFees: { ...delivery.zoneFees, [region]: value } });
  const setZoneEnabled = (region, value) =>
    setDelivery({ ...delivery, zoneEnabled: { ...delivery.zoneEnabled, [region]: value } });
  const setZoneEta = (region, value) =>
    setDelivery({
      ...delivery,
      zoneEtaMinutes: { ...delivery.zoneEtaMinutes, [region]: value },
    });

  /*
    Turning delivery on commits the merchant to arranging their own courier.
    That is a material obligation, not a preference, so it is stated and
    acknowledged before the switch actually flips — never discovered later
    when an order arrives with nobody to drive it.
  */
  const handleToggleDelivery = (checked) => {
    if (checked) {
      setShowTerms(true);
      return;
    }
    setField('enabled', false);
  };

  const acceptTerms = () => {
    setShowTerms(false);
    setDelivery({ ...delivery, enabled: true });
    // Open the section on the way in — the merchant has just committed to
    // delivery and the next thing they need is the pricing, so landing on a
    // collapsed row would make them hunt for it.
    if (!expanded) onToggleExpand();
  };

  const activeRegions = DELIVERY_REGIONS.filter((r) => delivery.zoneEnabled?.[r]);

  /*
    The quote is a pure function of the form's current values, so it recomputes
    on every keystroke with no network round-trip — and it reflects edits that
    haven't been saved yet, which is the question the merchant is actually
    asking.
  */
  const quote = useMemo(() => {
    if (!testInput.trim()) return null;
    return quoteDelivery({ ...delivery, enabled: true }, testInput);
  }, [delivery, testInput]);

  const testedSector = useMemo(
    () => (quote?.postalCode ? resolveSector(quote.postalCode) : null),
    [quote]
  );

  const fixedFeeValue = Number(delivery.fixedFee) || 0;

  // Waiting times differ per region, so the collapsed row shows the range
  // rather than pretending there's one number.
  const etaSummary = (() => {
    const mins = activeRegions.map((r) => Number(delivery.zoneEtaMinutes?.[r]) || DEFAULT_ETA_MINUTES);
    if (!mins.length) return '';
    const lo = Math.min(...mins);
    const hi = Math.max(...mins);
    return lo === hi ? ` ~${formatEta(lo)}.` : ` ${formatEta(lo)}–${formatEta(hi)}.`;
  })();

  const priceSummary = !delivery.enabled
    ? 'Off — customers can only choose pickup.'
    : delivery.mode === 'fixed'
      ? // "One flat fee of Free" is not a sentence.
        fixedFeeValue === 0
        ? 'Free delivery.'
        : `Flat ${formatFee(fixedFeeValue)}.`
      : activeRegions.length === DELIVERY_REGIONS.length
        ? 'Priced by region, island-wide.'
        : activeRegions.length === 0
          ? 'Priced by region — no regions turned on yet.'
          : `Priced by region — ${activeRegions.map((r) => REGION_LABELS[r]).join(', ')} only.`;

  const summary = delivery.enabled ? `${priceSummary}${etaSummary}` : priceSummary;

  return (
    <>
      <SectionToggle
        title="Delivery"
        summary={summary}
        checked={delivery.enabled}
        onToggle={handleToggleDelivery}
        switchDisabled={disabled}
        switchAriaLabel="Offer delivery"
        expanded={expanded}
        onToggleExpand={onToggleExpand}
      >
        {/* Restates the arrangement inside the section, so it is still there
            long after the one-time dialog was dismissed. */}
        <Alert severity="info" icon={<FaTruck />}>
          You arrange your own driver or courier. HomeFood doesn&apos;t collect or deliver orders —
          we pass the delivery details to you and let the customer track the order.
        </Alert>

        <div className={styles.deliveryField}>
          <Typography className={styles.deliveryLabel}>How you charge</Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={delivery.mode}
            disabled={disabled}
            onChange={(_e, v) => v && setField('mode', v)}
            className={styles.modeGroup}
          >
            <ToggleButton value="fixed">One flat fee</ToggleButton>
            <ToggleButton value="zone">By region</ToggleButton>
          </ToggleButtonGroup>
          <Typography className={styles.deliveryHint}>
            {delivery.mode === 'fixed'
              ? 'Every delivery costs the same, wherever it goes.'
              : 'The fee depends on which part of Singapore the customer is in.'}
          </Typography>
        </div>

        {delivery.mode === 'fixed' && (
          <div className={styles.deliveryField}>
            <TextField
              label="Delivery fee"
              type="number"
              size="small"
              disabled={disabled}
              value={delivery.fixedFee}
              onChange={(e) => setField('fixedFee', clampFee(e.target.value))}
              onBlur={(e) => setField('fixedFee', e.target.value === '' ? '0' : e.target.value)}
              inputProps={{ min: 0, max: 200, step: 0.5 }}
              InputProps={{ startAdornment: <InputAdornment position="start">S$</InputAdornment> }}
              helperText="Set 0 to deliver for free."
              sx={{ maxWidth: 240 }}
            />
          </div>
        )}

        {/*
          Coverage and waiting time are per-region in both pricing modes. One
          price island-wide doesn't make the drive to Tuas as quick as the one
          down the street, and the customer is quoted the time either way.
        */}
        <div className={styles.deliveryField}>
            <Typography className={styles.deliveryLabel}>
              {delivery.mode === 'fixed'
                ? 'Regions you deliver to, and how long it takes'
                : 'Regions you deliver to'}
            </Typography>
            <div className={styles.zoneGrid}>
              {DELIVERY_REGIONS.map((region) => {
                const on = Boolean(delivery.zoneEnabled?.[region]);
                return (
                  <div
                    key={region}
                    className={`${styles.zoneCard} ${on ? '' : styles.zoneCardOff}`}
                  >
                    {/*
                      Coverage is a selection, not a setting, so it reads as a
                      checkable row rather than a switch. Four full-size
                      switches in cards this small dominated them, and the
                      whole title row is a far bigger target than a toggle.
                    */}
                    <button
                      type="button"
                      className={styles.zoneCardHead}
                      disabled={disabled}
                      role="checkbox"
                      aria-checked={on}
                      aria-label={`Deliver to ${REGION_LABELS[region]}`}
                      onClick={() => setZoneEnabled(region, !on)}
                    >
                      <span className={styles.zoneCheck} aria-hidden="true">
                        {on && <FaCheck size={10} />}
                      </span>
                      <span className={styles.zoneName}>{REGION_LABELS[region]}</span>
                    </button>
                    <p className={styles.zoneAreas}>{REGION_HINTS[region]}</p>
                    {on ? (
                      <div className={styles.zoneInputs}>
                        {delivery.mode === 'zone' && (
                          <TextField
                            type="number"
                            size="small"
                            fullWidth
                            disabled={disabled}
                            value={delivery.zoneFees[region]}
                            onChange={(e) => setZoneFee(region, clampFee(e.target.value))}
                            onBlur={(e) => setZoneFee(region, e.target.value === '' ? '0' : e.target.value)}
                            inputProps={{
                              min: 0,
                              max: 200,
                              step: 0.5,
                              'aria-label': `${REGION_LABELS[region]} delivery fee`,
                            }}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">S$</InputAdornment>,
                            }}
                          />
                        )}
                        <TextField
                          type="number"
                          size="small"
                          fullWidth
                          disabled={disabled}
                          value={delivery.zoneEtaMinutes?.[region] ?? DEFAULT_ETA_MINUTES}
                          onChange={(e) => setZoneEta(region, clampEta(e.target.value))}
                          onBlur={(e) =>
                            setZoneEta(region, e.target.value === '' ? DEFAULT_ETA_MINUTES : e.target.value)
                          }
                          inputProps={{
                            min: MIN_ETA_MINUTES,
                            max: MAX_ETA_MINUTES,
                            step: 5,
                            'aria-label': `${REGION_LABELS[region]} waiting time in minutes`,
                          }}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">min</InputAdornment>,
                          }}
                        />
                      </div>
                    ) : (
                      <p className={styles.zoneOffNote}>Not delivered to</p>
                    )}
                  </div>
                );
              })}
            </div>

            {activeRegions.length === 0 ? (
              <Alert severity="warning">
                Turn on at least one region, or switch delivery off — otherwise customers see a
                delivery option that can never be quoted.
              </Alert>
            ) : (
              <Typography className={styles.deliveryHint}>
                Regions are worked out from the customer&apos;s postal code.
                {delivery.mode === 'zone' && ' Set a fee of 0 for a region you deliver to for free.'}
                {' '}Waiting time is what the customer sees when they order.
              </Typography>
            )}
          </div>

        <div>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FaSearch />}
            onClick={() => setTestOpen(true)}
          >
            Test a delivery address
          </Button>
        </div>
      </SectionToggle>

      {/* --- Obligation notice, shown before delivery actually switches on --- */}
      <Dialog open={showTerms} onClose={() => setShowTerms(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Before you turn on delivery</DialogTitle>
        <DialogContent>
          <div className={styles.termsBody}>
            <p>
              <strong>HomeFood.sg does not arrange delivery for you.</strong> We don&apos;t operate a
              fleet and we don&apos;t book couriers on your behalf.
            </p>
            <p>
              You are responsible for sourcing your own driver or delivery service, for getting the
              order to the customer, and for anything that goes wrong on the way.
            </p>
            <p>
              What we do: pass you the delivery address and fee with each order, and give the
              customer a way to track it.
            </p>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTerms(false)}>Cancel</Button>
          <Button variant="contained" onClick={acceptTerms}>
            I understand — turn on delivery
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Address tester --- */}
      <Dialog open={testOpen} onClose={() => setTestOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Test a delivery address</DialogTitle>
        <DialogContent>
          <div className={styles.testerDialogBody}>
            <TextField
              autoFocus
              size="small"
              fullWidth
              placeholder="Postal code, or an address containing one"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              inputProps={{ 'aria-label': 'Postal code or address to test' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FaLocationArrow size={12} />
                  </InputAdornment>
                ),
              }}
            />

            {quote === null ? (
              <p className={styles.testerIdle}>
                Enter a 6-digit Singapore postal code to see what that customer would be charged.
              </p>
            ) : quote.ok ? (
              <div className={styles.testerResult}>
                <div className={styles.testerResultMain}>
                  <span className={`${styles.regionPill} ${styles[`region_${quote.region}`]}`}>
                    {quote.regionLabel}
                  </span>
                  <span className={styles.testerArea}>{quote.area}</span>
                </div>
                <span className={styles.testerFigures}>
                  <span className={styles.testerFee}>{formatFee(quote.fee)}</span>
                  <span className={styles.testerEta}>{formatEta(quote.etaMinutes)}</span>
                </span>
              </div>
            ) : (
              <Alert severity="warning" className={styles.testerAlert}>
                {quote.message}
              </Alert>
            )}

            {quote?.postalCode && testedSector && (
              <p className={styles.testerFootnote}>
                Postal sector {String(testedSector.sector).padStart(2, '0')} &middot;{' '}
                {quote.postalCode}
              </p>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
