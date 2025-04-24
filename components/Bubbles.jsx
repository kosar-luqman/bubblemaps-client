import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import {
  forceSimulation,
  forceCollide,
  forceX,
  forceY,
  forceLink,
  forceManyBody,
} from "d3-force"

const BubbleChart = ({
  topTraders,
  links,
  selectedTrader,
  handleSelectTrader,
}) => {
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
  const [isLoading, setIsLoading] = useState(true)

  const width = 1000
  const height = 700

  // Memoize bubble initialization to avoid recalculating on every render
  const initializeBubbles = useCallback(() => {
    if (!topTraders || topTraders.length === 0) return []

    const totalVolume = topTraders.reduce(
      (sum, trader) =>
        sum + (trader.volume || Number(trader.realized_profit_usd) || 1),
      0
    )

    // Create nodes for each top trader
    const nodes = topTraders.map((trader, i) => {
      const wallet = trader.address
      const amount = trader.realized_profit_usd || 1
      const centerOffsetX = (Math.random() - 0.5) * 100
      const centerOffsetY = (Math.random() - 0.5) * 100

      return {
        id: i,
        r: 12 + (amount / totalVolume) * 150,
        wallet: wallet,
        amount: amount,
        volumePercentage: ((amount / totalVolume) * 100).toFixed(2) + "%",
        x: width / 2 + centerOffsetX,
        y: height / 2 + centerOffsetY,
        targetX: width / 2 + centerOffsetX,
        targetY: height / 2 + centerOffsetY,
        scale: 0, // Start with scale 0 for animation
      }
    })

    // Use the links directly since they're already using indices
    const linkData = links.map((link) => ({
      source: link.source,
      target: link.target,
    }))

    // Run simulation with fewer iterations for faster initialization
    const sim = forceSimulation(nodes)
      .force("x", forceX(width / 2).strength(0.1))
      .force("y", forceY(height / 2).strength(0.1))
      .force(
        "collide",
        forceCollide((d) => d.r + 15)
          .strength(0.8)
          .iterations(5) // Reduced iterations for faster calculation
      )
      .force("charge", forceManyBody().strength(-30))
      .force(
        "link",
        forceLink(linkData)
          .id((d) => d.id)
          .distance((d) => {
            const sourceNode = nodes.find((n) => n.id === d.source)
            const targetNode = nodes.find((n) => n.id === d.target)
            return sourceNode && targetNode
              ? (sourceNode.r + targetNode.r) * 1.5
              : 150
          })
          .strength(0.5)
      )
      .stop()

    // Run fewer ticks for initial layout (300 is much faster than 2000)
    for (let i = 0; i < 300; ++i) sim.tick()

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

    // Prepare final bubble positions with same target and current position
    // for immediate rendering without delay
    return nodes.map((n) => ({
      ...n,
      targetX: n.x,
      targetY: n.y,
      targetScale: 1, // Target scale is 1 (full size)
    }))
  }, [topTraders, links])

  // Initialize bubbles only once when data changes
  useEffect(() => {
    const initializedBubbles = initializeBubbles()
    setBubbles(initializedBubbles)
    setIsLoading(true)

    // Fit view after bubbles are initialized
    if (initializedBubbles.length > 0) {
      setTimeout(fitView, 100)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [topTraders, links, initializeBubbles])

  // Start load animation when bubbles are initialized
  useEffect(() => {
    if (bubbles.length === 0) return

    const startTime = Date.now()
    const animationDuration = 1000 // 1 second for the animation

    const animateLoading = () => {
      const now = Date.now()
      const elapsed = now - startTime
      const progress = Math.min(elapsed / animationDuration, 1)

      if (progress < 1) {
        setBubbles((prev) =>
          prev.map((b, i) => {
            // Stagger the animations slightly based on the bubble's index
            const staggeredProgress = Math.min(progress * (1 + i * 0.1), 1)
            // Use easeOutElastic for a bouncy effect
            const eased = easeOutElastic(staggeredProgress)
            return {
              ...b,
              scale: eased,
            }
          })
        )
        animationRef.current = requestAnimationFrame(animateLoading)
      } else {
        // Animation complete
        setBubbles((prev) => prev.map((b) => ({ ...b, scale: 1 })))
        setIsLoading(false)
      }
    }

    animationRef.current = requestAnimationFrame(animateLoading)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [bubbles.length])

  // Elastic easing function for bounce effect
  const easeOutElastic = (x) => {
    const c4 = (2 * Math.PI) / 3
    return x === 0
      ? 0
      : x === 1
      ? 1
      : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1
  }

  // Optimized animation loop with performance improvements
  useEffect(() => {
    // Only run animation when bubbles are loaded and not in loading state
    if (bubbles.length === 0 || isLoading) return

    // Use a throttled animation frame for smoother performance
    const animate = () => {
      setBubbles((prev) => {
        // Check if any bubbles need animation (significant difference between current and target)
        const needsAnimation = prev.some(
          (b) =>
            Math.abs(b.targetX - b.x) > 0.5 || Math.abs(b.targetY - b.y) > 0.5
        )

        // If no significant movement needed, don't update state
        if (!needsAnimation) return prev

        return prev.map((b) => {
          // Calculate distance to target
          const dx = b.targetX - b.x
          const dy = b.targetY - b.y

          // If the distance is very small, snap to target position
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
            return { ...b, x: b.targetX, y: b.targetY }
          }

          // Otherwise apply easing
          return {
            ...b,
            x: b.x + dx * 0.15,
            y: b.y + dy * 0.15,
          }
        })
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [bubbles.length, isLoading])

  // Function to fit all bubbles in view
  const fitView = useCallback(() => {
    if (!svgRef.current || bubbles.length === 0) return

    const svgRect = svgRef.current.getBoundingClientRect()
    const svgWidth = svgRect.width
    const svgHeight = svgRect.height

    const visibleWidth = bounds.maxX - bounds.minX
    const visibleHeight = bounds.maxY - bounds.minY

    const scaleX = svgWidth / visibleWidth
    const scaleY = svgHeight / visibleHeight
    const scale = Math.min(scaleX, scaleY) * 0.9

    const contentCenterX = (bounds.minX + bounds.maxX) / 2
    const contentCenterY = (bounds.minY + bounds.maxY) / 2

    const newPanX = svgWidth / 2 - contentCenterX * scale
    const newPanY = svgHeight / 2 - contentCenterY * scale

    setZoomLevel(scale)
    setPanOffset({ x: newPanX, y: newPanY })
  }, [bubbles, bounds])

  // Optimized event handlers using useCallback
  const handleMouseDown = useCallback(
    (e, id) => {
      e.stopPropagation()
      const svgRect = svgRef.current.getBoundingClientRect()
      const bubble = bubbles.find((b) => b.id === id)

      const mouseX = (e.clientX - svgRect.left - panOffset.x) / zoomLevel
      const mouseY = (e.clientY - svgRect.top - panOffset.y) / zoomLevel

      setDraggingId(id)
      setOffset({
        x: mouseX - bubble.x,
        y: mouseY - bubble.y,
      })
    },
    [bubbles, panOffset, zoomLevel]
  )

  const handleMouseMove = useCallback(
    (e) => {
      if (!svgRef.current) return

      const svgRect = svgRef.current.getBoundingClientRect()

      if (draggingId !== null) {
        e.stopPropagation()

        const mouseX = (e.clientX - svgRect.left - panOffset.x) / zoomLevel
        const mouseY = (e.clientY - svgRect.top - panOffset.y) / zoomLevel

        setBubbles((prev) =>
          prev.map((b) => {
            if (b.id === draggingId) {
              let newX = mouseX - offset.x
              let newY = mouseY - offset.y

              const margin = b.r + 10
              newX = Math.max(margin, Math.min(width - margin, newX))
              newY = Math.max(margin, Math.min(height - margin, newY))

              // Update target position but not actual position for smooth animation
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
    },
    [
      draggingId,
      isPanning,
      offset,
      panOffset,
      panStart,
      zoomLevel,
      width,
      height,
    ]
  )

  const handleMouseUp = useCallback(() => {
    setDraggingId(null)
    setIsPanning(false)
  }, [])

  const handleSvgMouseDown = useCallback(
    (e) => {
      if (draggingId === null) {
        setIsPanning(true)
        setPanStart({
          x: e.clientX,
          y: e.clientY,
        })
      }
    },
    [draggingId]
  )

  const handleWheel = useCallback(
    (e) => {
      e.preventDefault()

      if (!svgRef.current) return

      const svgRect = svgRef.current.getBoundingClientRect()
      const mouseX = e.clientX - svgRect.left
      const mouseY = e.clientY - svgRect.top

      const mouseInContentX = (mouseX - panOffset.x) / zoomLevel
      const mouseInContentY = (mouseY - panOffset.y) / zoomLevel

      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoomLevel = Math.max(0.1, Math.min(5, zoomLevel * delta))

      const newPanOffsetX = mouseX - mouseInContentX * newZoomLevel
      const newPanOffsetY = mouseY - mouseInContentY * newZoomLevel

      setZoomLevel(newZoomLevel)
      setPanOffset({
        x: newPanOffsetX,
        y: newPanOffsetY,
      })
    },
    [panOffset, zoomLevel]
  )

  // Memoize link components to prevent unnecessary re-renders
  const linkElements = useMemo(() => {
    return links
      .map((link, i) => {
        const source = bubbles.find((b) => b.id === link.source)
        const target = bubbles.find((b) => b.id === link.target)
        if (!source || !target) return null

        const dist = Math.sqrt(
          Math.pow(source.x - target.x, 2) + Math.pow(source.y - target.y, 2)
        )
        const maxDist = 3000
        const opacity = Math.max(0, 1 - dist / maxDist)

        // Only show links when bubbles are fully loaded
        const linkOpacity = isLoading ? 0 : opacity

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
            strokeOpacity={linkOpacity}
          />
        )
      })
      .filter(Boolean)
  }, [bubbles, links, isLoading])

  // Memoize bubble components to prevent unnecessary re-renders
  const bubbleElements = useMemo(() => {
    return bubbles.map((b) => {
      const isActive = selectedTrader?.wallet === b?.wallet
      const currentScale = b.scale || 0

      return (
        <g
          onClick={() => handleSelectTrader(b.wallet)}
          key={b.id}
          transform={`translate(${b.x},${b.y})`}
        >
          <circle
            r={b.r * currentScale}
            fill="#6536a340"
            stroke={isActive ? "#fff" : "#6536a3"}
            strokeWidth={isActive ? "5" : "3"}
            onMouseDown={(e) => handleMouseDown(e, b.id)}
            style={{ cursor: "grab" }}
          >
            <title>
              {b.wallet} - {b.amount}
            </title>
          </circle>
          {b.r > 20 && currentScale > 0.5 && (
            <text
              textAnchor="middle"
              dy="0.3em"
              fill="#fff"
              fontSize={(b.r / 3) * currentScale}
              opacity={currentScale}
              pointerEvents="none"
            >
              {b.wallet.substring(0, 6)}
            </text>
          )}
        </g>
      )
    })
  }, [bubbles, selectedTrader, handleSelectTrader, handleMouseDown])

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{
          background: "#11081d",
          cursor: draggingId ? "grabbing" : isPanning ? "grabbing" : "move",
          margin: "0 auto",
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
          {linkElements}
          {bubbleElements}
        </g>
      </svg>
    </div>
  )
}

export default React.memo(BubbleChart)
