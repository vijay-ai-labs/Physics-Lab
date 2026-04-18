# Shadows & Penumbra

## What Is This Experiment?
**Definition:** Real light sources (unlike perfect lasers) have width and physical size. When an "extended" light source is blocked by an object, it creates two distinct regions of shadow:
1.  **Umbra:** The dark, solid center where the light is completely blocked.
2.  **Penumbra:** The lighter, fuzzy outer ring where the light is only *partially* blocked.
**Real-World Example:** During a solar eclipse, the Moon blocks the Sun (an extended light source). If you stand in the Moon's *umbra*, you experience a total eclipse and darkness. If you stand slightly outside of it in the vast *penumbra*, you experience a partial eclipse, where a sliver of the Sun is still blindingly visible!

## Formulas Used
This is a geometric optics simulation relying on similar triangles. Imagine drawing a criss-cross of straight lines from the top and bottom of the light source to the top and bottom of the blocking object. 

If $w_L$ is light source width, $w_O$ is object width, $d_L$ is light-to-object distance, and $d_S$ is object-to-screen distance:

*   The **Umbra Width** on the screen generally shrinks the further the screen is placed. If the screen is too far, the umbra mathematically converges to a point and disappears entirely!
*   The **Penumbra Width** constantly expands as the screen is moved further away, growing increasingly fuzzy.

## Goal of the Experiment
The main objective is to find **How do extended light sources create fuzzy (penumbra) shadows?** to understand why real-world shadows are rarely perfectly sharp unless caused by a tiny pinpoint light.

## Simulation Controls
*   **Light Width (m):** How big the glowing bulb is. If you shrink this to 0, it becomes a theoretical "Point Source"—notice how the fuzzy penumbra instantly vanishes, leaving a razor-sharp umbra!
*   **Object Distance (m):** How close the blocker is to the wall/screen. Move it very far from the wall to make the shadow giant and incredibly blurry.
*   **Object Size (m):** The width of the obstacle casting the shadow.
*   **Ray Tracing Overlay:**
    *   **Inner Rays:** Traces from Light Bottom to Object Bottom (and Top to Top). This bounds the dark Umbra zone.
    *   **Cross Rays:** Traces from Light Bottom to Object Top. This bounds the edges of the gradient Penumbra zone.
