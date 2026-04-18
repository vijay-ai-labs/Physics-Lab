# Floating vs Sinking (Buoyancy)

## What Is This Experiment?
**Definition:** Archimedes' Principle states that an object partially or fully submerged in a fluid experiences an upward buoyant force equal to the weight of the fluid it displaces. Whether an object floats or sinks depends on its density relative to the fluid's density.
**Real-World Example:** A massive steel ship floats because its hull is shaped to displace a huge volume of water, creating a buoyant force large enough to support its weight (making its *average* density less than water). Meanwhile, a small solid pebble sinks immediately because it is denser than water.

## Formulas Used
**Density ($\rho$)** is defined as mass ($m$) divided by volume ($V$):
$$
\rho = \frac{m}{V}
$$

The **Weight ($F_g$)** of the object pulling it downwards is:
$$
F_g = m \cdot g = \rho_{\text{object}} \cdot V \cdot g
$$

The **Buoyant Force ($F_B$)** pushing it upwards is equal to the weight of the displaced liquid:
$$
F_B = \rho_{\text{liquid}} \cdot V_{\text{submerged}} \cdot g
$$

If the object is fully submerged ($V_{\text{submerged}} = V$), the net force acting on the object is:
$$
F_{\text{net}} = F_B - F_g = (\rho_{\text{liquid}} - \rho_{\text{object}}) \cdot V \cdot g
$$
*   If $F_{\text{net}} > 0$ (Liquid is denser), the object accelerates upwards and floats.
*   If $F_{\text{net}} < 0$ (Object is denser), the object accelerates downwards and sinks.

## Goal of the Experiment
The main objective is to find **Will an object float or sink based on its density?** to help us understand buoyancy and how the relationship between an object's mass and volume determines its behavior in a fluid.

## Simulation Controls
*   **Block Mass (kg):** Adjusts the mass of the block. Heavier blocks are denser (if volume is constant) and more likely to sink.
*   **Block Volume (L):** Adjusts the physical size of the block. Larger volumes decrease density and displace more liquid, increasing buoyant force.
*   **Liquid Density (kg/m³):** The density of the surrounding fluid. Water is 1000 kg/m³. Honey is denser (~1400 kg/m³), making things float easier, while oil is less dense (~800 kg/m³).
*   **Vector Overlays:**
    *   **Gravity:** The downward weight force ($F_g$).
    *   **Buoyancy:** The upward lifting force ($F_B$) from the liquid.
