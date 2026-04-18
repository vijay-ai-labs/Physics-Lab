# Heat Flow (Thermal Conduction)

## What Is This Experiment?
**Definition:** Heat flows naturally from a hotter body to a colder body until both reach the same temperature (Thermal Equilibrium). Conduction is the transfer of heat through solid materials via molecular collisions.
**Real-World Example:** If you leave a metal spoon in a pot of boiling soup, the handle of the spoon quickly becomes too hot to touch. The fast-moving (hot) molecules in the soup hit the spoon, transferring energy up the metal stem via conduction.

## Formulas Used
Fourier's Law of Thermal Conduction mathematically describes this rate of heat transfer ($P$ or $Q/t$):

$$
P = \frac{\Delta Q}{\Delta t} = -k \cdot A \cdot \frac{\Delta T}{L}
$$

Where:
*   $P$ is the rate of heat flow (Watts, W or Joules/sec).
*   $k$ is the Thermal Conductivity constant of the material (e.g., Copper is high, Wood is low).
*   $A$ is the cross-sectional Area of the bar.
*   $\Delta T$ is the temperature difference between the hot and cold ends.
*   $L$ is the Length of the bar.

## Goal of the Experiment
The main objective is to find **How does heat travel through different solid materials?** to understand how conductivity and temperature differentials dictate how fast thermal equilibrium is reached.

## Simulation Controls
*   **Hot Temp (°C):** The initial temperature of the heat source (Red block). Higher temperatures create a steeper gradient, driving heat faster.
*   **Cold Temp (°C):** The initial temperature of the cold sink (Blue block). 
*   **Thermal Conductivity ($k$):** Represents different materials. At high values (metals), heat rushes across the bar quickly. At low values (insulators like glass), heat barely trickles across.
*   **Visual Overlays:**
    *   The color gradient within the bar visually maps the temperature drop from the hot end to the cold end based on the current rate of flow.
