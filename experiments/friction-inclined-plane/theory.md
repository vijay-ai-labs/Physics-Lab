# Friction & Inclined Plane

## What Is This Experiment?
**Definition:** When an object is placed on a tilted surface (an inclined plane), gravity pulls it both downwards into the surface and along the surface. Friction acts in the opposite direction of the motion (or intended motion) to slow it down or prevent it from moving.
**Real-World Example:** Imagine a car parked on a steep hill. Gravity is trying to pull the car down the hill, but the friction between the tires and the road keeps it in place. If the hill gets too steep, gravity overcomes the static friction, and the car slides down.

## Formulas Used
On an inclined plane at an angle $\theta$, the force of gravity ($F_g = mg$) has two components:
1.  **Parallel component** (pulling down the slope): $F_{\text{parallel}} = mg \sin\theta$
2.  **Perpendicular component** (pushing into the surface): $F_{\text{normal}} = mg \cos\theta$

The opposing force of kinetic friction is:
$$
F_{\text{frict}} = \mu \cdot F_{\text{normal}} = \mu \cdot mg \cos\theta
$$

The net force acting along the plane is the difference between the parallel gravitational pull and friction:
$$
F_{\text{net}} = mg \sin\theta - \mu mg \cos\theta
$$

Using Newton's Second Law ($F = ma$), the acceleration of the block down the plane is:
$$
a = g(\sin\theta - \mu \cos\theta)
$$

## Goal of the Experiment
The main objective is to find **What net force moves a block on an inclined plane?** to help us understand how the angle of an incline and the surface roughness (friction) interact to determine whether an object slides and how fast it accelerates.

## Simulation Controls
*   **Angle (°):** The steepness of the ramp ($\theta$). Increasing the angle increases the parallel force pulling the block down and decreases the normal force (and thus friction).
*   **Mass (kg):** The mass of the block ($m$). While mass increases both the pulling force and the friction force proportionally, it cancels out in the acceleration equation!
*   **Friction Coefficient ($\mu$):** The roughness of the surface. Higher values require steeper angles to overcome static friction and start sliding.
*   **Vector Overlays:**
    *   **Gravity:** The constant downward pull of the Earth ($mg$).
    *   **Normal Force:** The force exerted by the ramp perpendicular to its surface.
    *   **Parallel Force:** The component of gravity pulling along the ramp.
    *   **Friction:** The force resisting motion, pointing up the ramp.
