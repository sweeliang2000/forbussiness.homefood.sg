'use client';
import { useEffect } from 'react';
import { animate } from 'motion';

/*
  Swipe-to-dismiss for the mobile nav drawer.

  The drawer tracks the finger 1:1 while it's being dragged, and on release it
  hands the finger's velocity straight to a spring — so there's no seam
  between "dragging" and "animating". Where it lands is decided by projecting
  the flick's momentum, not by where the finger happened to lift, which is
  what makes a quick flick throw the drawer shut.
*/

/* Normal scroll feel. Higher = the flick carries further. */
const DECELERATION_RATE = 0.998;
/* Movement needed before we commit to an axis, so a vertical scroll of the
   nav list is never mistaken for a horizontal drag. */
const DIRECTION_THRESHOLD = 8;
const RUBBERBAND_CONSTANT = 0.55;
const VELOCITY_WINDOW_MS = 100;

// Apple's projection function (Designing Fluid Interfaces): where the drawer
// would come to rest if this velocity were left to decay on its own.
const project = (velocity) =>
    ((velocity / 1000) * DECELERATION_RATE) / (1 - DECELERATION_RATE);

// Past the open edge there's nothing more to reveal, so resistance grows with
// the overshoot instead of the drawer simply stopping dead.
const rubberband = (overshoot, dimension) =>
    (overshoot * dimension * RUBBERBAND_CONSTANT) /
    (dimension + RUBBERBAND_CONSTANT * Math.abs(overshoot));

const currentX = (el) => {
    const { transform } = getComputedStyle(el);
    if (!transform || transform === 'none') return 0;
    try {
        return new DOMMatrixReadOnly(transform).m41;
    } catch {
        return 0;
    }
};

export function useDrawerDrag({
    drawerRef,
    scrimRef,
    isOpen,
    enabled,
    onClose,
    draggingClass
}) {
    useEffect(() => {
        const el = drawerRef.current;
        if (!el || !enabled || !isOpen) return undefined;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let activePointer = null;
        let axis = null;
        let startX = 0;
        let startY = 0;
        let baseX = 0;
        let offset = 0;
        let width = el.offsetWidth || 1;
        let animation = null;
        let samples = [];

        const paint = (x) => {
            el.style.transform = `translate3d(${x}px, 0, 0)`;
            const scrim = scrimRef.current;
            if (scrim) {
                // The scrim dims in step with the drag rather than waiting for
                // the release — the feedback is continuous, not terminal.
                scrim.style.opacity = String(Math.max(0, 1 + Math.min(0, x) / width));
            }
        };

        const releaseVelocity = (timeStamp) => {
            const recent = samples.filter((s) => timeStamp - s.t <= VELOCITY_WINDOW_MS);
            const first = recent[0] ?? samples[0];
            if (!first || timeStamp === first.t) return 0;
            return ((samples[samples.length - 1].x - first.x) / (timeStamp - first.t)) * 1000;
        };

        const onPointerDown = (event) => {
            // Dismiss-by-swipe is a touch affordance; a mouse has the scrim and
            // the toggle, and hijacking its drags would break text selection.
            if (event.pointerType === 'mouse' || activePointer !== null) return;

            // Interruptibility: grab the drawer mid-flight and continue from
            // wherever it is on screen, not from where it was heading.
            if (animation) {
                animation.stop();
                animation = null;
            }

            activePointer = event.pointerId;
            axis = null;
            startX = event.clientX;
            startY = event.clientY;
            baseX = currentX(el);
            offset = baseX;
            width = el.offsetWidth || width;
            samples = [{ x: event.clientX, t: event.timeStamp }];
        };

        const onPointerMove = (event) => {
            if (event.pointerId !== activePointer) return;

            const dx = event.clientX - startX;
            const dy = event.clientY - startY;

            if (axis === null) {
                if (Math.abs(dx) < DIRECTION_THRESHOLD && Math.abs(dy) < DIRECTION_THRESHOLD) return;
                if (Math.abs(dy) >= Math.abs(dx)) {
                    // Vertical intent — hand the gesture back to the nav list.
                    activePointer = null;
                    return;
                }
                axis = 'x';
                el.setPointerCapture(event.pointerId);
                el.classList.add(draggingClass);
            }

            samples.push({ x: event.clientX, t: event.timeStamp });
            if (samples.length > 6) samples.shift();

            const next = baseX + dx;
            offset = next <= 0 ? next : rubberband(next, width);
            paint(offset);
        };

        const settle = (shouldClose, velocity) => {
            el.classList.remove(draggingClass);
            const scrim = scrimRef.current;
            const duration = reduceMotion ? 0.15 : 0.35;

            animation = animate(
                el,
                { x: shouldClose ? -width : 0 },
                {
                    type: 'spring',
                    /* Overshoot past the closed position happens off-screen, so
                       it buys nothing and only delays the settle. A snap-back
                       returns to a position you can see, and the drag that
                       preceded it justifies a little give. */
                    bounce: shouldClose ? 0 : 0.15,
                    duration,
                    // The seam between finger and animation: the spring picks up
                    // at exactly the speed the finger left off.
                    velocity
                }
            );

            if (scrim) {
                // Opacity gets its own timing — the drag's px/s velocity is
                // meaningless on a 0–1 scale and would send it far past 1.
                animate(
                    scrim,
                    { opacity: shouldClose ? 0 : 1 },
                    { duration, ease: [0.32, 0.72, 0, 1] }
                );
            }

            animation.finished
                .then(() => {
                    animation = null;
                    if (shouldClose) {
                        // The effect's cleanup strips the inline transform in the
                        // same commit that drops the open class, so the drawer
                        // never flashes back to its open position.
                        onClose();
                    } else {
                        el.style.transform = '';
                        if (scrim) scrim.style.opacity = '';
                    }
                })
                .catch(() => {});
        };

        const onPointerUp = (event) => {
            if (event.pointerId !== activePointer) return;
            const wasDragging = axis === 'x';
            activePointer = null;
            axis = null;
            if (!wasDragging) return;

            const velocity = releaseVelocity(event.timeStamp);
            // Decide from where the gesture is *going*, not where it stopped.
            const projected = offset + project(velocity);
            settle(projected < -width / 2, velocity);
        };

        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
        el.addEventListener('pointercancel', onPointerUp);

        return () => {
            el.removeEventListener('pointerdown', onPointerDown);
            el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', onPointerUp);
            el.removeEventListener('pointercancel', onPointerUp);
            if (animation) animation.stop();
            el.classList.remove(draggingClass);
            el.style.transform = '';
            if (scrimRef.current) scrimRef.current.style.opacity = '';
        };
    }, [drawerRef, scrimRef, isOpen, enabled, onClose, draggingClass]);
}
