# Projectile Motion

## What Is This Experiment?
**Definition:** Projectile motion is the curved, predictable path an object takes when thrown or launched near the Earth's surface. Once launched, the *only* force acting on the object is gravity pulling it downwards (ignoring air resistance). 
**Real-World Example:** Firing a cannonball, throwing a football, or launching a golf ball. The object travels forward due to its initial momentum but falls simultaneously due to gravity, tracing out a perfect mathematical parabola.

## Formulas Used
Projectile motion is split into two independent components: horizontal ($x$) and vertical ($y$).

**Initial Velocity Components:**
$$
v_{0x} = v_0 \cos\theta
$$
$$
v_{0y} = v_0 \sin\theta
$$

**Time of Flight ($t_{\text{flight}}$):**
$$
t_{\text{flight}} = \frac{2 v_0 \sin\theta}{g}
$$

**Maximum Height ($H$):**
$$
H = \frac{(v_0 \sin\theta)^2}{2g}
$$

**Maximum Range ($R$):**
$$
R = \frac{v_0^2 \sin(2\theta)}{g}
$$

*(Note: Maximum range is mathematically achieved at a launch angle of exactly 45°)*.

## Goal of the Experiment
The main objective is to find **What is the projectile's range, max height & flight time?** by finding the optimal balance between launch speed and launch angle to reach a target.

## Simulation Controls
*   **Initial Velocity (m/s):** The raw speed the projectile is fired with ($v_0$).
*   **Launch Angle (°):** The pitch of the cannon upward ($\theta$). 45° yields the best distance, while 90° yields maximum height but zero distance!
*   **Vector Overlays:**
    *   **Velocity:** Shows the continuously updating tangent speed. Notice how the vertical component shrinks to zero at the peak!
    *   **Gravity:** Constant downward force vector ($g = 9.81\text{ m/s}^2$).
