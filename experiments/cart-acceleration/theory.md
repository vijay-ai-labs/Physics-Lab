# Cart Acceleration

## What Is This Experiment?
**Definition:** This is a dynamic application of Newton's Second Law, demonstrating the relationship between tension, friction, mass, and acceleration in a classic string-and-pulley physics problem.
**Real-World Example:** Imagine a tow truck pulling a broken-down car using a cable. The cable exerts a "tension" force on the car, accelerating it. If the car is on a rough gravel road, friction heavily resists the pull, meaning the truck must pull with greater force to achieve the same acceleration.

## Formulas Used
For a cart being pulled horizontally by a tension force ($T$) and opposed by friction:

$$
F_{\text{net}} = T - F_{\text{frict}}
$$

The force of kinetic friction is determined by the normal force (the cart's weight) multiplied by the surface roughness coefficient ($\mu$):
$$
F_{\text{frict}} = \mu \cdot m \cdot g
$$

Finally, substituting back into Newton's Second Law ($F = ma$):
$$
a = \frac{T - (\mu \cdot m \cdot g)}{m}
$$

## Goal of the Experiment
The main objective is to find **How does net force affect a cart's acceleration?** to help us visually connect a pulling force (tension/pull) to the real-time velocity and position of a wheeled vehicle over time.

## Simulation Controls
*   **Cart Mass (kg):** The mass of the cart ($m$). Increasing this makes the cart harder to pull, severely slowing acceleration.
*   **Pull Force (N):** The tension applied to the front of the cart string. 
*   **Friction Coefficient:** Determines energy lost to the wheels/surface. At 0, the environment is frictionless.
*   **Vector Overlays:**
    *   **Velocity:** Real-time speed vector showing current velocity.
    *   **Acceleration:** The rate of change vector ($a$).
    *   **Net Force:** The resultant functional pulling vector.
