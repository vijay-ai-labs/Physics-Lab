# Refraction & Snell's Law

## What Is This Experiment?
**Definition:** Refraction is the bending of light as it passes from one transparent medium to another (e.g., from air into water). This bending happens because light travels at different speeds in different materials! The "Index of Refraction" ($n$) describes how much the material slows down light.
**Real-World Example:** If you place a straight straw into a drinking glass of water, the straw appears "broken" or disjointed at the surface. The light coming from the underwater part of the straw is bent as it transitions out of the water into the air before reaching your eye, causing an optical illusion. 

## Formulas Used
**Snell's Law** precisely calculates this angle of bending:

$$
n_1 \sin\theta_1 = n_2 \sin\theta_2
$$

Where:
*   $n_1$ is the refractive index of the starting medium (Top). For air, $n \approx 1.0$.
*   $\theta_1$ is the angle of incidence (the initial laser angle, measured relative to the normal/vertical line).
*   $n_2$ is the refractive index of the entering medium (Bottom). For glass, $n \approx 1.5$.
*   $\theta_2$ is the angle of refraction (how sharply the beam bends).

**Total Internal Reflection (TIR):**
If light tries to exit a slow, dense medium ($n_1$) into a fast medium ($n_2$) at a very shallow angle, it won't be able to escape. It reflects completely off the boundary! The critical angle for this is:
$$
\theta_c = \arcsin\left(\frac{n_2}{n_1}\right)
$$

## Goal of the Experiment
The main objective is to find **How does light bend when moving between materials?** to interactively test Snell's Law and successfully trigger Total Internal Reflection.

## Simulation Controls
*   **Incident Angle (°):** Aim the laser pointer. 0° means pointing straight down (no refraction occurs).
*   **Top Index ($n_1$):** Density of the top medium. Try setting this higher than the bottom index to trap the light inside!
*   **Bottom Index ($n_2$):** Density of the bottom medium. Higher numbers bend the light closer to the vertical centerline.
*   **Laser Overlay:**
    *   **Red Ray:** The main refracted beam crossing the boundary.
    *   **Blue Ray:** The instantly reflected portion of the beam that bounces off the surface like a mirror.
