import React, { useState, useEffect, useRef } from "react"
import {
  forceSimulation,
  forceCollide,
  forceX,
  forceY,
  forceLink,
  forceManyBody,
} from "d3-force"

const width = 1000
const height = 700

const BubbleChart = ({ topTraders, links, handleSelectTrader }) => {
  const svgRef = useRef(null)
  const contentRef = useRef(null)
  const animationRef = useRef(null)
  const [bubbles, setBubbles] = useState([])
  const [draggingId, setDraggingId] = useState(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [zoomLevel, setZoomLevel] = useState(0.7)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [bounds, setBounds] = useState({ minX: 0, maxX: 0, minY: 0, maxY: 0 })

  // Step 1: Initialize bubbles with strong centering
  useEffect(() => {
    if (!topTraders || topTraders.length === 0) return

    const totalVolume = topTraders.reduce(
      (sum, trader) =>
        sum + (trader.volume || Number(trader.realized_profit_usd) || 1),
      0
    )

    // Create nodes for each top trader
    const nodes = topTraders.map((trader, i) => {
      // Get wallet address
      const wallet = trader.address || trader.wallet

      // Calculate bubble size based on volume or profit
      const amount = trader.volume || Number(trader.realized_profit_usd) || 1

      // Start nodes close to the center with small random offsets
      const centerOffsetX = (Math.random() - 0.5) * 100 // Small random offset from center
      const centerOffsetY = (Math.random() - 0.5) * 100

      return {
        id: i,
        r: 12 + (amount / totalVolume) * 150, // Percentage-based sizing
        wallet: wallet,
        amount: amount,
        volumePercentage: ((amount / totalVolume) * 100).toFixed(2) + "%",
        x: width / 2 + centerOffsetX,
        y: height / 2 + centerOffsetY,
        targetX: width / 2 + centerOffsetX,
        targetY: height / 2 + centerOffsetY,
      }
    })

    // Use the links directly since they're already using indices
    const linkData = links.map((link) => ({
      source: link.source,
      target: link.target,
    }))

    // Configure and run D3 force simulation with strong centering
    const sim = forceSimulation(nodes)
      .force("x", forceX(width / 2).strength(0.1)) // Strong center force
      .force("y", forceY(height / 2).strength(0.1)) // Strong center force
      .force(
        "collide",
        forceCollide((d) => d.r + 15) // Tighter collision detection
          .strength(0.8)
          .iterations(10)
      )
      .force("charge", forceManyBody().strength(-30))
      .force(
        "link",
        forceLink(linkData)
          .id((d) => d.id)
          .distance((d) => {
            // Calculate distance based on node radii
            const sourceNode = nodes.find((n) => n.id === d.source)
            const targetNode = nodes.find((n) => n.id === d.target)
            return sourceNode && targetNode
              ? (sourceNode.r + targetNode.r) * 1.5
              : 150 // Tighter linkage
          })
          .strength(0.5) // Stronger link force
      )
      .stop()

    // Run simulation iterations for better initial layout
    for (let i = 0; i < 2000; ++i) sim.tick()

    // Calculate bounds for all nodes
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity
    nodes.forEach((node) => {
      const radius = node.r || 0
      minX = Math.min(minX, node.x - radius)
      maxX = Math.max(maxX, node.x + radius)
      minY = Math.min(minY, node.y - radius)
      maxY = Math.max(maxY, node.y + radius)
    })

    // Add padding to bounds
    const padding = 50
    minX -= padding
    maxX += padding
    minY -= padding
    maxY += padding

    setBounds({ minX, maxX, minY, maxY })

    // Prepare final bubble positions
    const prepared = nodes.map((n) => ({
      ...n,
      targetX: n.x,
      targetY: n.y,
    }))

    setBubbles(prepared)

    // Calculate optimal zoom and pan to fit all nodes
    setTimeout(fitView, 100)
  }, [topTraders, links])

  // Function to fit all bubbles in view
  const fitView = () => {
    if (!svgRef.current || bubbles.length === 0) return

    const svgRect = svgRef.current.getBoundingClientRect()
    const svgWidth = svgRect.width
    const svgHeight = svgRect.height

    // Calculate visible area width and height
    const visibleWidth = bounds.maxX - bounds.minX
    const visibleHeight = bounds.maxY - bounds.minY

    // Calculate scale to fit content
    const scaleX = svgWidth / visibleWidth
    const scaleY = svgHeight / visibleHeight
    const scale = Math.min(scaleX, scaleY) * 0.9 // 90% of the calculated scale for padding

    // Calculate center of content
    const contentCenterX = (bounds.minX + bounds.maxX) / 2
    const contentCenterY = (bounds.minY + bounds.maxY) / 2

    // Calculate new pan offset to center content
    const newPanX = svgWidth / 2 - contentCenterX * scale
    const newPanY = svgHeight / 2 - contentCenterY * scale

    setZoomLevel(scale)
    setPanOffset({ x: newPanX, y: newPanY })
  }

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

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
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
        prev.map((b) => {
          if (b.id === draggingId) {
            // Calculate new position
            let newX = mouseX - offset.x
            let newY = mouseY - offset.y

            // Apply boundaries - keep within canvas with some margin
            const margin = b.r + 10
            newX = Math.max(margin, Math.min(width - margin, newX))
            newY = Math.max(margin, Math.min(height - margin, newY))

            return {
              ...b,
              targetX: newX,
              targetY: newY,
            }
          }
          return b
        })
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

  // Step 5: Mouse wheel zoom with improved handling
  const handleWheel = (e) => {
    e.preventDefault()

    // Get mouse position relative to SVG
    const svgRect = svgRef.current.getBoundingClientRect()
    const mouseX = e.clientX - svgRect.left
    const mouseY = e.clientY - svgRect.top

    // Calculate mouse position in the zoomed/panned space
    const mouseInContentX = (mouseX - panOffset.x) / zoomLevel
    const mouseInContentY = (mouseY - panOffset.y) / zoomLevel

    // Calculate new zoom level with more precise control
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

          {bubbles.map((b) => (
            <g
              onClick={() => handleSelectTrader(b.wallet)}
              key={b.id}
              transform={`translate(${b.x},${b.y})`}
            >
              <circle
                r={b.r}
                fill="#6536a340"
                stroke="#6536a3"
                strokeWidth="3"
                onMouseDown={(e) => handleMouseDown(e, b.id)}
                style={{ cursor: "grab" }}
              >
                <title>
                  {b.wallet} - {b.amount}
                </title>
              </circle>
              <text
                textAnchor="middle"
                dy="0.3em"
                fill="#fff"
                fontSize={b.r > 20 ? b.r / 3 : 0}
                pointerEvents="none"
              >
                {b.wallet.substring(0, 6)}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

export default BubbleChart
