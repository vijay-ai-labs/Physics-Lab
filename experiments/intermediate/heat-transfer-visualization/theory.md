# Heat Transfer Visualization

## What Is This Experiment?
**Definition:** Heat transfer is the movement of thermal energy from one thing to another. In 2D continuous materials, heat diffuses outward from a heat source to the colder surrounding areas according to the heat equation.
**Real-World Example:** Imagine dropping a scorching hot coal onto a large, thick sheet of metal in a cold room. The spot directly beneath the coal gets extremely hot instantly. Slowly, the heat "bleeds" outwards in circular rings, warming up the rest of the metal sheet over time until the entire sheet reaches a lower, uniform temperature.

## Formulas Used
The 2D Heat Equation (Diffusion Equation) describes this mathematically:

$$
\frac{\partial T}{\partial t} = \alpha \left( \frac{\partial^2 T}{\partial x^2} + \frac{\partial^2 T}{\partial y^2} \right)
$$

Where:
*   $T$ is the temperature at a specific point $(x,y)$ and time $(t)$.
*   $\alpha$ is the Thermal Diffusivity of the material (how fast the heat spreads).

For this grid-based simulation, we use a discrete finite-difference approximation:
$$
T_{\text{new}} = T_{\text{old}} + \alpha \cdot \Delta t \cdot (T_{\text{left}} + T_{\text{right}} + T_{\text{up}} + T_{\text{down}} - 4 \cdot T_{\text{old}})
$$

## Goal of the Experiment
The main objective is to find **How does heat diffuse across a 2D surface over time?** to visualize the invisible flow of thermal energy and how the material's properties speed up or slow down this spread.

## Simulation Controls
*   **Diffusivity ($\alpha$):** How easily the material conducts and spreads heat. High values mean heat spreads rapidly (like copper). Low values mean the heat stays trapped securely at the source (like wood or plastic).
*   **Source Temp (°C):** The temperature of the central heat source driving the diffusion.
*   **Visual Overlays:**
    *   **Color Mapping:** The 2D grid uses a color gradient. Blue represents cold (ambient) temperatures, yellow/orange is warm, and white/bright red signifies intense heat. Watch the gradient expand!
