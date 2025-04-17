import React, { useState, useEffect, useRef } from "react"
import {
  forceSimulation,
  forceCollide,
  forceX,
  forceY,
  forceLink,
} from "d3-force"

// import traders from "../public/top100.json"
import { links } from "@/components/links"

const width = 1000
const height = 500

const BubbleChart = ({ traders }) => {
  const svgRef = useRef(null)
  const contentRef = useRef(null)
  const animationRef = useRef(null)
  const [bubbles, setBubbles] = useState([])
  const [draggingId, setDraggingId] = useState(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // Step 1: Initialize bubbles
  useEffect(() => {
    const maxAmount = Math.max(...traders.map((h) => h.volume))
    const nodes = traders.map((h, i) => ({
      id: i,
      r: 20 + (h.volume / maxAmount) * 30,
      wallet: h.wallet,
      volume: h.volume,
      x: Math.random() * width,
      y: Math.random() * height,
      targetX: Math.random() * width,
      targetY: Math.random() * height,
      color: i < 10 ? "gold" : i < 50 ? "skyblue" : "lightgray",
    }))

    // Prepare links for d3 force layout
    const linkData = links.map((link) => ({
      source: link.source,
      target: link.target,
    }))

    const sim = forceSimulation(nodes)
      // Reduce the strength of center-pulling forces
      .force("x", forceX(width / 2).strength(0.01)) // Reduced from 0.03
      .force("y", forceY(height / 2).strength(0.01)) // Reduced from 0.03
      .force(
        "collide",
        forceCollide((d) => d.r + 5) // Reduced padding from 15 to 5
          .strength(0.7)
          .iterations(4)
      )
      .force(
        "link",
        forceLink(linkData)
          .id((d) => d.id)
          .distance((d) => {
            // Make linked nodes stay closer together
            const sourceNode = nodes.find((n) => n.id === d.source.id)
            const targetNode = nodes.find((n) => n.id === d.target.id)
            return (sourceNode.r + targetNode.r) * 1.2 // Reduced from 1.5
          })
          .strength(0.7) // Increased from 0.3 to make links pull stronger
      )
      .stop()

    // Run more simulation iterations for better initial layout
    for (let i = 0; i < 1000; ++i) sim.tick() // Increased from 500

    const prepared = nodes.map((n) => ({
      ...n,
      targetX: n.x,
      targetY: n.y,
    }))

    setBubbles(prepared)

    // Center the initial view
    setPanOffset({
      x: width / 4,
      y: height / 4,
    })
    setZoomLevel(0.8)
  }, [])

  // Step 2: Smooth animation loop
  useEffect(() => {
    const animate = () => {
      setBubbles((prev) =>
        prev.map((b) => {
          const dx = b.targetX - b.x
          const dy = b.targetY - b.y

          return {
            ...b,
            x: b.x + dx * 0.15,
            y: b.y + dy * 0.15,
          }
        })
      )
      animationRef.current = requestAnimationFrame(animate)
    }
    animationRef.current = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationRef.current)
  }, [])

  // Step 3: Drag handling for bubbles
  const handleMouseDown = (e, id) => {
    e.stopPropagation() // Prevent panning
    const svgRect = svgRef.current.getBoundingClientRect()
    const bubble = bubbles.find((b) => b.id === id)

    // Calculate position considering zoom and pan
    const mouseX = (e.clientX - svgRect.left - panOffset.x) / zoomLevel
    const mouseY = (e.clientY - svgRect.top - panOffset.y) / zoomLevel

    setDraggingId(id)
    setOffset({
      x: mouseX - bubble.x,
      y: mouseY - bubble.y,
    })
  }

  const handleMouseMove = (e) => {
    const svgRect = svgRef.current.getBoundingClientRect()

    if (draggingId !== null) {
      e.stopPropagation() // Prevent panning

      // Calculate position considering zoom and pan
      const mouseX = (e.clientX - svgRect.left - panOffset.x) / zoomLevel
      const mouseY = (e.clientY - svgRect.top - panOffset.y) / zoomLevel

      setBubbles((prev) =>
        prev.map((b) =>
          b.id === draggingId
            ? {
                ...b,
                targetX: mouseX - offset.x,
                targetY: mouseY - offset.y,
              }
            : b
        )
      )
    } else if (isPanning) {
      // Handle panning
      const dx = e.clientX - panStart.x
      const dy = e.clientY - panStart.y

      setPanOffset({
        x: panOffset.x + dx,
        y: panOffset.y + dy,
      })

      setPanStart({
        x: e.clientX,
        y: e.clientY,
      })
    }
  }

  const handleMouseUp = () => {
    setDraggingId(null)
    setIsPanning(false)
  }

  // Step 4: Pan handling for background
  const handleSvgMouseDown = (e) => {
    if (draggingId === null) {
      setIsPanning(true)
      setPanStart({
        x: e.clientX,
        y: e.clientY,
      })
    }
  }

  // Step 5: Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault()

    // Get mouse position relative to SVG
    const svgRect = svgRef.current.getBoundingClientRect()
    const mouseX = e.clientX - svgRect.left
    const mouseY = e.clientY - svgRect.top

    // Calculate mouse position in the zoomed/panned space
    const mouseInContentX = (mouseX - panOffset.x) / zoomLevel
    const mouseInContentY = (mouseY - panOffset.y) / zoomLevel

    // Calculate new zoom level
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoomLevel = Math.max(0.1, Math.min(5, zoomLevel * delta))

    // Adjust pan offset to zoom centered on mouse position
    const newPanOffsetX = mouseX - mouseInContentX * newZoomLevel
    const newPanOffsetY = mouseY - mouseInContentY * newZoomLevel

    setZoomLevel(newZoomLevel)
    setPanOffset({
      x: newPanOffsetX,
      y: newPanOffsetY,
    })
  }

  // Calculate line opacity based on node distance
  const calculateLinkOpacity = (source, target) => {
    const dist = Math.sqrt(
      Math.pow(source.x - target.x, 2) + Math.pow(source.y - target.y, 2)
    )
    const maxDist = 3000 // Maximum distance for visible links
    return Math.max(0, 1 - dist / maxDist)
  }

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        style={{
          background: "#11081d",
          cursor: draggingId ? "grabbing" : isPanning ? "grabbing" : "move",
        }}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <g
          ref={contentRef}
          transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}
        >
          {links.map((link, i) => {
            const source = bubbles.find((b) => b.id === link.source)
            const target = bubbles.find((b) => b.id === link.target)
            if (!source || !target) return null

            const opacity = calculateLinkOpacity(source, target)

            return (
              <line
                key={i}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="#aaa"
                strokeWidth="1.5"
                strokeDasharray="4"
                strokeOpacity={opacity}
              />
            )
          })}

          {traders.map((b) => (
            <g key={b.id} transform={`translate(${b.x},${b.y})`}>
              <circle
                r={b.r}
                fill="#6536a340"
                stroke="#6536a3"
                strokeWidth="3"
                onMouseDown={(e) => handleMouseDown(e, b.id)}
                style={{ cursor: "grab" }}
              >
                <title>
                  {b.wallet} - {b.volume}
                </title>
              </circle>
              {/* {(b.id < 10 || zoomLevel > 1.5) && ( */}
              <text
                textAnchor="middle"
                dy="0.3em"
                fill="#fff"
                fontSize={b.r > 20 ? b.r / 3 : 0}
                pointerEvents="none"
                // style={{ opacity: zoomLevel > 0.8 ? 1 : 0 }}
              >
                {b.wallet.substring(0, 6)}
              </text>
              {/* )} */}
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

export default BubbleChart
