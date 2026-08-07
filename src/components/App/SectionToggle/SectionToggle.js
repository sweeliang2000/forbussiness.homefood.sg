'use client';

import { Collapse, Switch, Tooltip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { FaCheckCircle } from 'react-icons/fa';
import styles from './SectionToggle.module.css';

/**
 * A section that is both switched on/off and expanded/collapsed from the same
 * header row.
 *
 * The pattern started on Payments Setup and is now shared, because two copies
 * of a control this fiddly drift: the switch has to stop its click from
 * reaching the disclosure, the disclosure has to stay keyboard-operable, and a
 * disabled switch needs a wrapper before a tooltip will fire over it. Getting
 * that right once is the point of the component.
 *
 * The switch and the disclosure are deliberately independent — you can turn a
 * section on without opening it, and read one without changing it.
 */
export default function SectionToggle({
  title,
  summary,
  badges = null,
  checked,
  onToggle,
  switchDisabled = false,
  switchTooltip = '',
  switchAriaLabel,
  showActivePill = true,
  expanded,
  onToggleExpand,
  children,
}) {
  const theSwitch = (
    // A disabled control emits no pointer events, so the tooltip needs a
    // wrapper to hang off. The wrapper also swallows the click so flipping
    // the switch doesn't also open the section.
    <span className={styles.switchWrap} onClick={(e) => e.stopPropagation()}>
      <Switch
        checked={checked}
        disabled={switchDisabled}
        inputProps={{ 'aria-label': switchAriaLabel || `Enable ${title}` }}
        onChange={(e) => onToggle(e.target.checked)}
      />
    </span>
  );

  return (
    <div className={styles.section}>
      <div
        className={styles.sectionHeader}
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpand();
          }
        }}
      >
        {switchTooltip ? (
          <Tooltip title={switchTooltip} placement="top">
            {theSwitch}
          </Tooltip>
        ) : (
          theSwitch
        )}

        <div className={styles.sectionHeaderText}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>{title}</span>
            {badges}
            {checked && showActivePill && (
              <span className={styles.activePill}>
                <FaCheckCircle size={12} /> Active
              </span>
            )}
          </div>
          {/* Stays visible while collapsed, so a closed row still says what
              it is instead of forcing you to open it to find out. */}
          {summary && <p className={styles.sectionSummary}>{summary}</p>}
        </div>

        <ExpandMoreIcon
          className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}
        />
      </div>

      <Collapse in={expanded}>
        <div className={styles.collapseInner}>{children}</div>
      </Collapse>
    </div>
  );
}
