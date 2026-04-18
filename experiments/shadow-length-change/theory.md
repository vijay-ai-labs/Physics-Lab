# Shadow Length Change

## What Is This Experiment?
**Definition:** When an opaque object blocks light from a distant source like the sun, it casts a shadow. The length of this shadow changes dramatically throughout the day purely due to the geometric angle of the light source relative to the horizon.
**Real-World Example:** As the Sun rises in the early morning, it hits objects at a very low, shallow angle, creating incredibly long shadows stretching across the grass. At high noon, when the Sun is directly overhead (zenith), shadows are tiny or completely hidden underneath you! Ancient sundials used this exact principle to tell time accurately before mechanical clocks.

## Formulas Used
Shadow length is a pure trigonometric calculation. We form a right triangle where:
*   The object represents the opposite side ($h$).
*   The shadow length on the ground is the adjacent side ($L$).
*   The light ray from the tip of the sun to the tip of the shadow forms the hypotenuse.

Using the tangent function for the angle of elevation ($\theta$):
$$
\tan(\theta) = \frac{\text{Opposite}}{\text{Adjacent}} = \frac{h}{L}
$$

Rearranging to solve for the Shadow Length ($L$):
$$
L = \frac{h}{\tan(\theta)}
$$

## Goal of the Experiment
The main objective is to find **How does the sun's angle impact shadow length over a day?** to visually understand the geometry of shadows and why they stretch exponentially as the sun approaches sunset.

## Simulation Controls
*   **Sun Angle (°):** Adjusts the elevation of the sun above the horizon. 90° is directly overhead (noon). Notice how approaching 0° (sunset) makes the shadow length spike to infinity!
*   **Object Height (m):** How tall the person or flagpole is. A taller object inherently casts a proportionately longer shadow at any given angle.
*   **Ray Tracing Overlay:**
    *   A simulated light beam traces from the sun, past the top edge of the object, tracking exactly where it strikes the ground to terminate the shadow box.
