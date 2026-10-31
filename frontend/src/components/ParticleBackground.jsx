import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Line2, LineMaterial, LineGeometry } from 'three-stdlib'

export default function ParticleBackground({ reducedGraphics, isDarkMode }) {
    const mountRef = useRef(null)

    useEffect(() => {
        if (reducedGraphics || !mountRef.current) return

        const currentMount = mountRef.current
        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
        camera.position.z = 15

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
        renderer.setSize(window.innerWidth, window.innerHeight)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        currentMount.appendChild(renderer.domElement)

        // Colors based on theme
        const wireColor = isDarkMode ? 0xf5b400 : 0xd97706 // Amber vs darker orange
        const pulseColor = isDarkMode ? 0x00ffcc : 0x0284c7 // Cyan vs darker blue

        // --- 1. Neural Nodes ---
        const nodeCount = 50
        const nodes = []
        const nodeGeometry = new THREE.SphereGeometry(0.08, 8, 8)
        const nodeMaterial = new THREE.MeshBasicMaterial({ color: wireColor })

        for (let i = 0; i < nodeCount; i++) {
            const mesh = new THREE.Mesh(nodeGeometry, nodeMaterial)
            mesh.position.set(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20
            )
            scene.add(mesh)
            nodes.push({
                mesh,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.02,
                    (Math.random() - 0.5) * 0.02,
                    (Math.random() - 0.5) * 0.02
                )
            })
        }

        // --- 2. Thick Wires (Threads) ---
        const wireMaterial = new LineMaterial({
            color: wireColor,
            linewidth: 1.5, // Thinner wires
            transparent: true,
            opacity: 0.1, // Fainter wires
        })
        wireMaterial.resolution.set(window.innerWidth, window.innerHeight)

        const wires = []
        const maxWires = 60

        for (let i = 0; i < maxWires; i++) {
            const wireGeometry = new LineGeometry()
            wireGeometry.setPositions([0, 0, 0, 0, 0, 0])
            const wire = new Line2(wireGeometry, wireMaterial)
            wire.visible = false
            scene.add(wire)
            wires.push(wire)
        }

        // --- 3. Light Pulses ---
        const pulseCount = 6 // Very few pulses
        const pulseGeometry = new THREE.SphereGeometry(0.02, 6, 6) // Tiny
        const pulseMaterial = new THREE.MeshBasicMaterial({
            color: pulseColor,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.8
        })
        const pulses = []

        for (let i = 0; i < pulseCount; i++) {
            const mesh = new THREE.Mesh(pulseGeometry, pulseMaterial)
            mesh.visible = false
            scene.add(mesh)
            pulses.push({
                mesh,
                wireIndex: -1,
                progress: Math.random(),
                speed: 0.001 + Math.random() * 0.002 // Very slow
            })
        }

        // --- 4. Mouse Tracking ---
        const mouse = new THREE.Vector2(0, 0)
        const targetMouse = new THREE.Vector2(0, 0)

        function onMouseMove(event) {
            targetMouse.x = (event.clientX / window.innerWidth) * 2 - 1
            targetMouse.y = -(event.clientY / window.innerHeight) * 2 + 1
        }
        window.addEventListener('mousemove', onMouseMove)

        // --- 5. Animation Loop ---
        let animationFrameId
        const clock = new THREE.Clock()
        let activeWires = []

        function animate() {
            animationFrameId = requestAnimationFrame(animate)

            mouse.lerp(targetMouse, 0.05)
            camera.position.x += (mouse.x * 2 - camera.position.x) * 0.05
            camera.position.y += (mouse.y * 2 - camera.position.y) * 0.05
            camera.lookAt(scene.position)

            // Update nodes
            nodes.forEach(node => {
                node.mesh.position.add(node.velocity)
                if (Math.abs(node.mesh.position.x) > 10) node.velocity.x *= -1
                if (Math.abs(node.mesh.position.y) > 10) node.velocity.y *= -1
                if (Math.abs(node.mesh.position.z) > 10) node.velocity.z *= -1
            })

            // Rebuild connections
            activeWires = []
            let wireIdx = 0

            for (let i = 0; i < nodeCount; i++) {
                for (let j = i + 1; j < nodeCount; j++) {
                    if (wireIdx >= maxWires) break
                    const dist = nodes[i].mesh.position.distanceTo(nodes[j].mesh.position)
                    if (dist < 4.5) {
                        const wire = wires[wireIdx]
                        const p1 = nodes[i].mesh.position
                        const p2 = nodes[j].mesh.position

                        wire.geometry.setPositions([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z])
                        wire.visible = true

                        activeWires.push({ p1, p2 })
                        wireIdx++
                    }
                }
            }

            for (let k = wireIdx; k < maxWires; k++) {
                wires[k].visible = false
            }

            // Move pulses
            pulses.forEach(pulse => {
                if (activeWires.length === 0) {
                    pulse.mesh.visible = false
                    return
                }
                pulse.mesh.visible = true

                if (pulse.wireIndex === -1 || pulse.wireIndex >= activeWires.length) {
                    pulse.wireIndex = Math.floor(Math.random() * activeWires.length)
                    pulse.progress = 0
                }

                const wire = activeWires[pulse.wireIndex]
                pulse.progress += pulse.speed

                if (pulse.progress >= 1) {
                    pulse.progress = 0
                    pulse.wireIndex = Math.floor(Math.random() * activeWires.length)
                }

                pulse.mesh.position.lerpVectors(wire.p1, wire.p2, pulse.progress)

                // Subtle scale based on position along wire
                const glow = Math.sin(pulse.progress * Math.PI)
                pulse.mesh.scale.setScalar(glow * 0.5 + 0.5)
            })

            renderer.render(scene, camera)
        }

        animate()

        function handleResize() {
            camera.aspect = window.innerWidth / window.innerHeight
            camera.updateProjectionMatrix()
            renderer.setSize(window.innerWidth, window.innerHeight)
            wireMaterial.resolution.set(window.innerWidth, window.innerHeight)
        }
        window.addEventListener('resize', handleResize)

        return () => {
            cancelAnimationFrame(animationFrameId)
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('resize', handleResize)
            if (currentMount) currentMount.removeChild(renderer.domElement)
        }
    }, [reducedGraphics, isDarkMode])

    if (reducedGraphics) {
        return <div style={{ position: 'fixed', inset: 0, zIndex: -1, background: isDarkMode ? 'radial-gradient(circle at 50% 50%, #13161c 0%, #08090c 100%)' : 'radial-gradient(circle at 50% 50%, #f8fafc 0%, #e2e8f0 100%)' }} />
    }

    return (
        <div
            ref={mountRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: -1,
                pointerEvents: 'none',
                background: isDarkMode ? 'radial-gradient(circle at 50% 50%, #13161c 0%, #08090c 100%)' : 'radial-gradient(circle at 50% 50%, #f8fafc 0%, #e2e8f0 100%)'
            }}
        />
    )
}