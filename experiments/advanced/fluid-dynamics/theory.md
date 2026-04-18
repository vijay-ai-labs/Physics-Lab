# Fluid Dynamics (Bernoulli's Principle)

## What Is This Experiment?
**Definition:** Bernoulli's Principle states that for an incompressible, smoothly flowing fluid, an increase in the speed of the fluid occurs simultaneously with a decrease in internal pressure or a decrease in the fluid's potential energy.
**Real-World Example:** How airplane wings generate lift! The curved top of the wing forces air to travel a longer path across it compared to the flat bottom, meaning the air on top must move *faster*. According to Bernoulli, this faster-moving top air exerts *lower pressure* than the slower-moving bottom air. The resulting high pressure beneath pushes the massive airplane upward into the sky!

## Formulas Used
This relates to two primary laws mathematically describing pipe flow:

**1. Continuity Equation (Conservation of Mass):**
The volume of water entering a pipe must equal the volume exiting. Thus, if the pipe narrows, the fluid must speed up.
$$
A_1 \cdot v_1 = A_2 \cdot v_2
$$
*(Where $A$ is cross-sectional Area and $v$ is velocity)*

**2. Bernoulli's Equation (Conservation of Energy):**
Pressure energy, kinetic energy, and potential energy remain constant along a streamline. Assuming a horizontal pipe (ignoring height/gravity drops):
$$
P_1 + \frac{1}{2} \rho v_1^2 = P_2 + \frac{1}{2} \rho v_2^2
$$
Where:
*   $P$ is Fluid Pressure (Pascals).
*   $\rho$ is Fluid Density (kg/m³).
*   $v$ is Fluid Velocity (m/s).
If $v_2$ dramatically increases (due to a pipe bottleneck), $P_2$ must drastically drop to balance the equation!

## Goal of the Experiment
The main objective is to find **How does pipe width impact fluid speed and pressure?** to observe firsthand why pinching a garden hose makes the water spray faster, but surprisingly lowers the internal pipe pressure.

## Simulation Controls
*   **Pipe Width #1 (Left):** Diameter of the entry pipe.
*   **Pipe Width #2 (Right):** Diameter of the exit pipe. Try creating an extreme bottleneck (large entry, tiny exit).
*   **Flow Rate (Velocity):** The base speed of the fluid being pumped in. 
*   **Visual Overlays:**
    *   **Particle Flow:** Tiny dots representing the liquid dynamically speed up as they cram into narrow sections, solving the Continuity Equation in real-time!
    *   **Pressure Gauges:** Dynamic readouts confirming the inverse relationship. Watch the right gauge plummet when the liquid is forced to accelerate.
