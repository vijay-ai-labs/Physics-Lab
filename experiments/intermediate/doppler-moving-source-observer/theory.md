# Doppler Effect — Moving Source & Observer

## What Is the Doppler Effect?
The Doppler effect describes the change in perceived frequency of a wave when either the source or the observer is moving relative to the medium.

**Real-world example:** You hear the Doppler effect every day. When an ambulance with its siren blaring approaches you, the pitch (frequency) of the siren sounds higher. The moment it passes and drives away, the pitch noticeably drops. The siren itself isn't changing its sound—rather, the sound waves "bunch up" as it approaches you and "stretch out" as it moves away.

## Formulas Used
When both the source and the observer move along the same line, the observed frequency is calculated as:

$$
f_{\text{obs}} = f_{\text{src}} \cdot \frac{v_{\text{sound}} \pm v_{\text{obs}}}{v_{\text{sound}} \mp v_{\text{src}}}
$$

*(Note: The upper signs apply when the observer and source move toward each other, and lower signs apply when moving away. In our simulation, both move rightward.)*

The **Mach number** (ratio of source speed to the speed of sound) determines if the source is subsonic or supersonic:

$$
M = \frac{v_{\text{src}}}{v_{\text{sound}}}
$$

When $M \geq 1$ (supersonic), a shockwave forms at a Mach angle $\theta$:

$$
\sin\theta_{\text{Mach}} = \frac{1}{M}
$$

## Goal of the Experiment
The main objective is to calculate and visualize the **observed frequency ($f_{\text{obs}}$)** heard by an observer when a wave source is moving at a specific speed compared to the speed of sound. We want to see how the relative motion shifts the frequency higher (Blue shift) or lower (Red shift), and observe what happens when a source outruns its own sound waves (Sonic Boom).

## Simulation Controls
- **Source Speed (m/s):** The velocity ($v_{\text{src}}$) of the wave-emitting source. Setting this above the sound speed creates a supersonic shockwave.
- **Observer Speed (m/s):** The velocity ($v_{\text{obs}}$) of the listener. Moving this helps explore scenarios where the listener tries to run away from or towards the waves.
- **Emitted Frequency (Hz):** The original frequency ($f_{\text{src}}$) produced by the source. This is what the source "actually" sounds like if you were traveling alongside it.
- **Sound Speed (m/s):** The speed of the wave in the medium ($v_{\text{sound}}$). In air at room temperature, this is roughly 343 m/s.
- **Play Audio:** Toggles a Web Audio oscillator that lets you *hear* the actual shifted observed frequency.
- **Mach Cone:** Toggles the visual rendering of the V-shaped shockwave boundaries when the source goes supersonic ($M \geq 1$).
