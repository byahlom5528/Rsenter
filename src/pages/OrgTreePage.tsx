import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Network, 
  Search, 
  User, 
  X, 
  ListTree, 
  GitFork, 
  ChevronLeft, 
  ChevronDown, 
  Sparkles, 
  Zap, 
  Info,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Maximize2
} from 'lucide-react';
import { OrgNode } from '../types/database';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { getSimplifiedRoleInterface, SimplifiedRoleInterface } from '../services/interfaceMapping';

interface TreeNode extends OrgNode {
  children: TreeNode[];
}

export const OrgTreePage: React.FC = () => {
  const { currentRole } = useAuth();
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Pan & Zoom and Auto-Fit State
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const baseScaleRef = useRef<number>(1);
  const scaleRef = useRef<number>(1);
  scaleRef.current = scale;
  const panRef = useRef<{ x: number; y: number }>(pan);
  panRef.current = pan;

  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef<boolean>(false);

  // Touch gesture refs
  const pinchDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);

  const loadOrgData = async () => {
    try {
      const data = await db.getOrgNodes();
      setNodes(data);
    } catch (err) {
      console.error('Failed to load org tree nodes', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrgData();
    const unsubscribe = db.subscribe(loadOrgData);
    return () => {
      unsubscribe();
    };
  }, []);

  // Listen to Escape key to close details drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectNode = (node: OrgNode) => {
    setSelectedNode(node);
    setIsDrawerOpen(true);
  };

  // High-performance Auto-Fit calculation: ensures the full tree is visible by default
  const calculateBaseScale = useCallback(() => {
    if (containerRef.current && contentRef.current) {
      const containerW = containerRef.current.clientWidth - 24;
      const unscaledW = contentRef.current.scrollWidth;
      const unscaledH = contentRef.current.scrollHeight;

      if (containerW > 0 && unscaledW > 0) {
        const fitScale = Math.min(1, Number((containerW / unscaledW).toFixed(3)));
        baseScaleRef.current = fitScale;
        scaleRef.current = fitScale;
        setScale(fitScale);
        setPan({ x: 0, y: 0 });
        panRef.current = { x: 0, y: 0 };
        setContainerHeight(Math.ceil(unscaledH * fitScale) + 32);
      }
    }
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setScale((s) => {
      const next = Math.min(2.5, Number((s + 0.15).toFixed(2)));
      scaleRef.current = next;
      return next;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => {
      const next = Math.max(0.2, Number((s - 0.15).toFixed(2)));
      scaleRef.current = next;
      return next;
    });
  }, []);

  const resetToFullView = useCallback(() => {
    calculateBaseScale();
  }, [calculateBaseScale]);

  // Run auto-fit on load and on window resize
  useEffect(() => {
    if (!isLoading && nodes.length > 0 && viewMode === 'tree') {
      calculateBaseScale();
      const timer = setTimeout(calculateBaseScale, 60);
      const timer2 = setTimeout(calculateBaseScale, 200);

      window.addEventListener('resize', calculateBaseScale);
      window.addEventListener('orientationchange', calculateBaseScale);

      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
        window.removeEventListener('resize', calculateBaseScale);
        window.removeEventListener('orientationchange', calculateBaseScale);
      };
    }
  }, [isLoading, nodes.length, viewMode, calculateBaseScale]);

  // Global mouse drag listeners for free panning in all directions
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left-click
    isDraggingRef.current = true;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...panRef.current };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedRef.current = true;
      }
      const newPan = {
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      };
      panRef.current = newPan;
      setPan(newPan);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Mouse wheel zoom & touch gestures for mobile (attached when tree container renders)
  useEffect(() => {
    if (isLoading || viewMode !== 'tree') return;
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 1.08 : 0.92;
      setScale((prevScale) => {
        const nextScale = Math.min(2.5, Math.max(0.2, Number((prevScale * zoomDelta).toFixed(3))));
        scaleRef.current = nextScale;
        return nextScale;
      });
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        setIsDragging(true);
        hasMovedRef.current = false;
        dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        panStartRef.current = { ...panRef.current };
      } else if (e.touches.length === 2) {
        isDraggingRef.current = false;
        setIsDragging(false);
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinchDistRef.current = dist;
        pinchStartScaleRef.current = scaleRef.current;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDraggingRef.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - dragStartRef.current.x;
        const dy = e.touches[0].clientY - dragStartRef.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          hasMovedRef.current = true;
        }
        const newPan = {
          x: panStartRef.current.x + dx,
          y: panStartRef.current.y + dy,
        };
        panRef.current = newPan;
        setPan(newPan);
      } else if (e.touches.length === 2 && pinchDistRef.current !== null) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (pinchDistRef.current > 0) {
          const factor = dist / pinchDistRef.current;
          const nextScale = Math.min(
            2.5,
            Math.max(0.2, Number((pinchStartScaleRef.current * factor).toFixed(3)))
          );
          scaleRef.current = nextScale;
          setScale(nextScale);
        }
      }
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      pinchDistRef.current = null;
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isLoading, viewMode]);

  // Memoized cycle-safe tree builder
  const treeData = useMemo(() => {
    if (nodes.length === 0) return [];

    const nodeIds = new Set(nodes.map((n) => n.id));
    const visited = new Set<string>();

    const buildSubTree = (parentId: string | null): TreeNode[] => {
      return nodes
        .filter((n) => {
          if (visited.has(n.id)) return false;
          if (parentId === null) {
            return !n.parent_id || !nodeIds.has(n.parent_id);
          }
          return n.parent_id === parentId;
        })
        .map((n) => {
          visited.add(n.id);
          return {
            ...n,
            children: buildSubTree(n.id),
          };
        });
    };

    const tree = buildSubTree(null);

    nodes.forEach((n) => {
      if (!visited.has(n.id)) {
        visited.add(n.id);
        tree.push({
          ...n,
          children: buildSubTree(n.id),
        });
      }
    });

    return tree;
  }, [nodes]);

  // Memoized relative interfaces map for all nodes
  const nodeInterfacesMap = useMemo(() => {
    const map = new Map<string, SimplifiedRoleInterface>();
    nodes.forEach((n) => {
      map.set(n.id, getSimplifiedRoleInterface(currentRole, n));
    });
    return map;
  }, [nodes, currentRole]);

  // Selected Relative Interface
  const relativeInterface: SimplifiedRoleInterface | null = useMemo(() => {
    if (!selectedNode) return null;
    return nodeInterfacesMap.get(selectedNode.id) || getSimplifiedRoleInterface(currentRole, selectedNode);
  }, [selectedNode, currentRole, nodeInterfacesMap]);

  // Superior commander of selected node
  const parentOfSelected = useMemo(() => {
    if (!selectedNode || !selectedNode.parent_id) return null;
    return nodes.find((n) => n.id === selectedNode.parent_id) || null;
  }, [selectedNode, nodes]);

  // Direct subordinates of selected node
  const childrenOfSelected = useMemo(() => {
    if (!selectedNode) return [];
    return nodes.filter((n) => n.parent_id === selectedNode.id);
  }, [selectedNode, nodes]);

  /* ========================================================================= */
  /* CLASSIC REGULAR TREE RENDERING (ENLARGED TYPOGRAPHY, CLEAN MINIMALIST)   */
  /* ========================================================================= */

  const renderRegularTreeNode = (node: TreeNode, level: number = 1) => {
    const isSelected = selectedNode?.id === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = collapsedNodes[node.id];

    const isMatch = searchTerm.trim() !== '' && (
      node.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.holder_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Original balanced width per tier ensuring the full tree fits naturally on screen
    const cardWidthClass = 
      level === 1 
        ? 'w-44 sm:w-52 md:w-56' 
        : level === 2 
        ? 'w-32 sm:w-36 md:w-40' 
        : 'w-28 sm:w-32 md:w-34';

    return (
      <div key={node.id} className="flex flex-col items-center select-none">
        
        {/* Node Card */}
        <div
          onClick={() => {
            if (!hasMovedRef.current) {
              handleSelectNode(node);
            }
          }}
          className={`node-card cursor-pointer ${cardWidthClass} py-2.5 px-2 rounded-xl border-2 transition-all duration-150 text-center relative shadow-2xs ${
            isSelected
              ? 'bg-white border-brand-600 shadow-xl ring-3 ring-brand-500/30 scale-105 z-20'
              : level === 1
              ? 'bg-slate-900 text-white border-slate-700 hover:border-indigo-400 z-10'
              : isMatch
              ? 'bg-amber-50 border-amber-400 shadow-xs ring-2 ring-amber-300 z-10'
              : 'bg-white border-slate-200 hover:border-brand-300 hover:shadow-md z-10'
          }`}
        >
          {/* 1. שם התפקיד */}
          <h4 className={`font-black tracking-tight leading-snug truncate ${
            level === 1 
              ? 'text-sm sm:text-base md:text-lg text-white' 
              : level === 2 
              ? 'text-[13px] sm:text-sm md:text-[15px] text-slate-900' 
              : 'text-xs sm:text-[13px] md:text-sm text-slate-900'
          }`}>
            {node.title}
          </h4>

          {/* 2. שם מאייש */}
          <div className={`font-semibold truncate mt-0.5 ${
            level === 1 
              ? 'text-xs sm:text-sm text-slate-300' 
              : level === 2 
              ? 'text-[11.5px] sm:text-xs text-slate-600' 
              : 'text-[10.5px] sm:text-[11.5px] text-slate-600'
          }`}>
            {node.holder_name}
          </div>
        </div>

        {/* Children Branching with Connecting Lines */}
        {hasChildren && !isCollapsed && (
          <div className="flex flex-col items-center w-full">
            {/* Stem down from parent */}
            <div className="w-0.5 h-2.5 sm:h-3 bg-slate-300"></div>

            {node.children.length > 1 ? (
              <div className="flex justify-center items-start">
                <div className="flex gap-1 sm:gap-1.5 justify-center items-start">
                  {node.children.map((child, index) => {
                    const isFirst = index === 0;
                    const isLast = index === node.children.length - 1;
                    return (
                      <div key={child.id} className="relative flex flex-col items-center">
                        {/* Horizontal branch line: in RTL, first is rightmost, last is leftmost */}
                        {!isFirst && (
                          <div className="absolute top-0 right-0 w-1/2 h-0.5 bg-slate-300"></div>
                        )}
                        {!isLast && (
                          <div className="absolute top-0 left-0 w-1/2 h-0.5 bg-slate-300"></div>
                        )}
                        {/* Stem down to child */}
                        <div className="w-0.5 h-2.5 sm:h-3 bg-slate-300"></div>
                        {renderRegularTreeNode(child, level + 1)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-2.5 sm:h-3 bg-slate-300"></div>
                {renderRegularTreeNode(node.children[0], level + 1)}
              </div>
            )}
          </div>
        )}

      </div>
    );
  };

  /* ========================================================================= */
  /* LIST VIEW (ACCORDION)                                                     */
  /* ========================================================================= */

  const renderListItem = (node: TreeNode, depth: number = 0) => {
    const isSelected = selectedNode?.id === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = collapsedNodes[node.id];
    const nodeRelative = nodeInterfacesMap.get(node.id) || getSimplifiedRoleInterface(currentRole, node);

    return (
      <div key={node.id} className="w-full">
        <div
          onClick={() => handleSelectNode(node)}
          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-right cursor-pointer ${
            isSelected
              ? 'bg-brand-50 border-brand-500 shadow-sm ring-2 ring-brand-300'
              : nodeRelative.isMyNode
              ? 'bg-brand-50/70 border-brand-400'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
          style={{ marginRight: `${depth * 14}px` }}
        >
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
              depth === 0 ? 'bg-slate-900 text-white' : depth === 1 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {depth === 0 ? '👑' : depth === 1 ? '⭐' : '🔹'}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">{node.title}</h4>
                {currentRole && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${nodeRelative.relationshipColor}`}>
                    {nodeRelative.relationshipBadge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">מאייש: {node.holder_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {hasChildren && (
              <button
                type="button"
                onClick={(e) => toggleCollapse(node.id, e)}
                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs transition-colors"
                title={isCollapsed ? 'פתח כפיפים' : 'כווץ כפיפים'}
              >
                {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {hasChildren && !isCollapsed && (
          <div className="space-y-2 mt-2">
            {node.children.map((child) => renderListItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-5 w-full max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full mb-1.5">
            <Network className="w-3.5 h-3.5" />
            <span>מבנה ארגוני יחידתי</span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white mb-1">
            עץ מבנה ארגוני וממשקי עבודה
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {currentRole ? (
              <span>
                מבנה יחידתי מלא בתצוגה קבועה ונקייה. ממשקי העבודה מוצגים <strong>ביחס לתפקידך: {currentRole.name}</strong>.
              </span>
            ) : (
              'עץ מבנה יחידתי בתצוגה קבועה ונקייה המותאמת במלואה לרוחב המסך במחשב ובנייד.'
            )}
          </p>
        </div>
      </div>

      {/* Clean Top Action Bar (Without expand/collapse or highlight buttons) */}
      <div className="sticky top-14 md:top-16 z-30 bg-slate-50/95 backdrop-blur-md py-2 -mx-3 px-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="חפש תפקיד או מאייש בעץ..."
            className="w-full pl-4 pr-9 py-1.5 bg-white rounded-xl border border-slate-300 focus:border-brand-500 outline-none text-xs sm:text-sm shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* View Mode Toggle: Tree vs List */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-xl self-end sm:self-auto">
          <button
            onClick={() => setViewMode('tree')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'tree' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="עץ מבנה"
          >
            <GitFork className="w-3.5 h-3.5 text-brand-600" />
            <span>עץ</span>
          </button>

          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="רשימה"
          >
            <ListTree className="w-3.5 h-3.5" />
            <span>רשימה</span>
          </button>
        </div>

      </div>

      {/* Helpful Hint */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-1.5 bg-indigo-50/80 border border-indigo-200/60 rounded-xl text-[11.5px] text-indigo-900 font-medium">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>גרור עם העכבר/אצבע לכל הכיוונים • גלול עם הגלגלת או השתמש בכפתורי ה-Zoom • לחץ על תפקיד לצפייה בממשק</span>
        </div>
      </div>

      {/* Main Container */}
      {isLoading ? (
        <div className="bg-slate-100/80 border border-slate-200 rounded-2xl sm:rounded-3xl p-16 text-center text-slate-500 min-h-[460px] flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-xs font-semibold">טוען מבנה ארגוני וממשקים...</p>
        </div>
      ) : viewMode === 'tree' ? (
        
        /* 
           INTERACTIVE PAN & ZOOM CANVAS:
           - Drag to move freely in any direction (X & Y)
           - Mouse wheel cursor-centered zoom
           - Touch pinch & pan gestures on mobile
           - Floating toolbar with Zoom In / Out / Fit to Screen / Reset
        */
        <div 
          ref={containerRef}
          onMouseDown={handleMouseDown}
          className="w-full bg-white/95 border border-slate-200/80 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xs relative flex flex-col items-center justify-start overflow-hidden select-none cursor-grab active:cursor-grabbing"
          style={{
            height: containerHeight ? `${containerHeight}px` : 'auto',
            minHeight: '380px',
            touchAction: 'none'
          }}
        >
          {/* Floating Pan & Zoom Controls Toolbar */}
          <div 
            className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1 rounded-xl border border-slate-200 shadow-sm"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={zoomIn}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-brand-600 transition-colors"
              title="זום פנימה (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-slate-700 min-w-[36px] text-center select-none">
              {Math.round(scale * 100)}%
            </span>

            <button
              type="button"
              onClick={zoomOut}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-brand-600 transition-colors"
              title="זום החוצה (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <div className="w-px h-3.5 bg-slate-200 mx-0.5" />

            <button
              type="button"
              onClick={resetToFullView}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-brand-600 text-xs font-bold transition-colors"
              title="אפס לתצוגה מלאה שרואים את כל העץ"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>תצוגה מלאה</span>
            </button>
          </div>

          {/* Canvas Content */}
          <div 
            ref={contentRef}
            className="flex flex-col items-center origin-top select-none"
            style={{ 
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: 'top center',
              width: 'max-content',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              willChange: 'transform'
            }}
          >
            {treeData.map((rootNode) => renderRegularTreeNode(rootNode, 1))}
          </div>
        </div>

      ) : (

        /* HIERARCHICAL ACCORDION LIST */
        <div className="w-full bg-slate-100/80 border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3">
          <div className="bg-brand-50/80 border border-brand-200/90 p-3.5 rounded-2xl text-xs text-brand-900 font-medium flex items-center gap-2">
            <ListTree className="w-4 h-4 text-brand-600 shrink-0" />
            <span>תצוגת רשימה היררכית נוחה. לחץ על כל תפקיד לצפייה בפירוט הממשק ביחס לתפקידך.</span>
          </div>
          <div className="space-y-2">
            {treeData.map((rootNode) => renderListItem(rootNode, 0))}
          </div>
        </div>

      )}

      {/* Floating Quick Interface Banner (when node selected and drawer closed) */}
      {selectedNode && relativeInterface && !isDrawerOpen && (
        <div className="fixed bottom-20 md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-white/95 backdrop-blur-md rounded-2xl border border-brand-300 shadow-xl p-3 flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-extrabold text-xs text-slate-900 truncate">{selectedNode.title}</span>
                <span className={`text-[8.5px] font-extrabold px-1.5 py-0.2 rounded border ${relativeInterface.relationshipColor}`}>
                  {relativeInterface.relationshipBadge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">מאייש: <strong>{selectedNode.holder_name}</strong></p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="px-2.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
            >
              ממשק מלא ➔
            </button>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              title="סגור"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Full Role Interface Slide-Over Drawer (Responsive for Mobile bottom-sheet & Desktop side-drawer) */}
      {isDrawerOpen && selectedNode && relativeInterface && (
        <div 
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-stretch sm:justify-start transition-opacity"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:w-[460px] max-h-[88vh] sm:max-h-full sm:h-full rounded-t-3xl sm:rounded-t-none sm:rounded-l-3xl shadow-2xl border-t sm:border-t-0 sm:border-r border-slate-200 p-5 sm:p-6 overflow-y-auto space-y-4 animate-in slide-in-from-bottom sm:slide-in-from-left duration-300 text-right"
          >
            {/* Mobile Drag Indicator Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-2 sm:hidden"></div>

            {/* Header: Title, Holder & Close Button */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
              <div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border mb-1.5 ${relativeInterface.relationshipColor}`}>
                  <Zap className="w-3 h-3" />
                  <span>{relativeInterface.relationshipBadge}</span>
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">{selectedNode.title}</h3>
                
                <div className="flex items-center gap-2 text-xs text-slate-700 mt-2 bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                  <User className="w-4 h-4 text-brand-600 shrink-0" />
                  <span className="font-bold">מאייש:</span>
                  <span className="font-extrabold text-slate-900">{selectedNode.holder_name}</span>
                </div>
              </div>

              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0 mr-2"
                title="סגור (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. ממשק איתי (Personalized work interface relative to logged-in role) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-600" />
                  <span>ממשק איתי (סנכרון והשפעה הדדית)</span>
                </h4>
                <span className="text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md">
                  מותאם עבורך
                </span>
              </div>
              <div className="p-4 bg-gradient-to-br from-brand-50/90 via-indigo-50/50 to-white rounded-2xl border border-brand-200/90 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium shadow-2xs">
                {relativeInterface.interfaceText}
              </div>
            </div>

            {/* 2. הגדרת התפקיד ותחומי אחריות */}
            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-xs font-black text-slate-900 uppercase mb-1.5 flex items-center gap-1.5">
                <ListTree className="w-4 h-4 text-slate-700" />
                <span>הגדרת תפקיד ותחומי אחריות</span>
              </h4>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                {selectedNode.description}
              </div>
            </div>

            {/* 3. מפקד ממונה ישיר (אם יש) */}
            {parentOfSelected && (
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-[11px] font-bold text-slate-500 mb-1.5">
                  מפקד ממונה ישיר:
                </h4>
                <button
                  onClick={() => setSelectedNode(parentOfSelected)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-right flex items-center justify-between transition-colors"
                >
                  <div>
                    <span className="font-extrabold text-xs text-slate-900 block">{parentOfSelected.title}</span>
                    <span className="text-[11px] text-slate-500">מאייש: {parentOfSelected.holder_name}</span>
                  </div>
                  <span className="text-indigo-600 font-bold text-xs">עבור ➔</span>
                </button>
              </div>
            )}

            {/* 4. כפיפים ישירים (אם יש) */}
            {childrenOfSelected.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-[11px] font-bold text-slate-500 mb-1.5">
                  כפיפים ישירים ({childrenOfSelected.length}):
                </h4>
                <div className="space-y-1.5">
                  {childrenOfSelected.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => setSelectedNode(child)}
                      className="w-full p-2 rounded-xl bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-300 text-right flex items-center justify-between transition-colors"
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{child.title}</span>
                        <span className="text-[10px] text-slate-500">{child.holder_name}</span>
                      </div>
                      <span className="text-brand-600 text-xs font-bold">➔</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setIsDrawerOpen(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors mt-4"
            >
              סגור פירוט
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
