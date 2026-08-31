import React, { useState, useEffect, useRef } from 'react';
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
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  Compass
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
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [highlightOnlyMyInterfaces, setHighlightOnlyMyInterfaces] = useState(false);
  
  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const loadOrgData = async () => {
    try {
      const data = await db.getOrgNodes();
      setNodes(data);
      if (data.length > 0 && !selectedNode) {
        const root = data.find((n) => !n.parent_id) || data[0];
        setSelectedNode(root);
      }
    } catch (err) {
      console.error('Failed to load org tree nodes', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrgData();
    const unsubscribe = db.subscribe(loadOrgData);
    return () => unsubscribe();
  }, []);

  // Listen to Escape key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileDrawerOpen(false);
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
    setIsMobileDrawerOpen(true);
  };

  // Zoom handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(1.5, Number((prev + 0.15).toFixed(2))));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.4, Number((prev - 0.15).toFixed(2))));
  const handleResetZoom = () => setZoom(1);

  // Center tree in container
  const centerTree = () => {
    if (chartContainerRef.current) {
      const el = chartContainerRef.current;
      el.scrollTo({
        left: (el.scrollWidth - el.clientWidth) / 2,
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (!isLoading && nodes.length > 0) {
      const timer = setTimeout(centerTree, 250);
      return () => clearTimeout(timer);
    }
  }, [isLoading, viewMode]);

  // Mouse pan handlers for smooth canvas navigation in 2D
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!chartContainerRef.current) return;
    if ((e.target as HTMLElement).closest('button, input, select, a, .node-card')) return;
    setIsDragging(true);
    setDragStart({
      x: e.pageX - chartContainerRef.current.offsetLeft,
      y: e.pageY - chartContainerRef.current.offsetTop,
      scrollLeft: chartContainerRef.current.scrollLeft,
      scrollTop: chartContainerRef.current.scrollTop,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !chartContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - chartContainerRef.current.offsetLeft;
    const y = e.pageY - chartContainerRef.current.offsetTop;
    const walkX = (x - dragStart.x) * 1.3;
    const walkY = (y - dragStart.y) * 1.3;
    chartContainerRef.current.scrollLeft = dragStart.scrollLeft - walkX;
    chartContainerRef.current.scrollTop = dragStart.scrollTop - walkY;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pan handlers for mobile 2D free panning
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [isTouchPanning, setIsTouchPanning] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!chartContainerRef.current || e.touches.length !== 1) return;
    if ((e.target as HTMLElement).closest('button, input, select, a, .node-card')) return;
    const touch = e.touches[0];
    setIsTouchPanning(true);
    setTouchStart({
      x: touch.pageX - chartContainerRef.current.offsetLeft,
      y: touch.pageY - chartContainerRef.current.offsetTop,
      scrollLeft: chartContainerRef.current.scrollLeft,
      scrollTop: chartContainerRef.current.scrollTop,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTouchPanning || !chartContainerRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const x = touch.pageX - chartContainerRef.current.offsetLeft;
    const y = touch.pageY - chartContainerRef.current.offsetTop;
    const walkX = (x - touchStart.x) * 1.2;
    const walkY = (y - touchStart.y) * 1.2;
    chartContainerRef.current.scrollLeft = touchStart.scrollLeft - walkX;
    chartContainerRef.current.scrollTop = touchStart.scrollTop - walkY;
  };

  const handleTouchEnd = () => {
    setIsTouchPanning(false);
  };

  // Robust Tree Builder with Cycle Detection and Orphan Node Support
  const buildCycleSafeTree = (): TreeNode[] => {
    if (nodes.length === 0) return [];

    const nodeIds = new Set(nodes.map((n) => n.id));
    const visited = new Set<string>();

    const buildSubTree = (parentId: string | null): TreeNode[] => {
      return nodes
        .filter((n) => {
          if (visited.has(n.id)) return false;
          if (parentId === null) {
            // Root node: parent_id is null OR parent does not exist in node list (orphan)
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

    // Any node not reached due to disconnected cycles -> add as root-level fallback
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
  };

  const treeData = buildCycleSafeTree();

  // Selected Relative Interface
  const relativeInterface: SimplifiedRoleInterface | null = selectedNode
    ? getSimplifiedRoleInterface(currentRole, selectedNode)
    : null;

  // Render Visual Chart Tree Node
  const renderTreeNode = (node: TreeNode, level: number = 1) => {
    const isSelected = selectedNode?.id === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = collapsedNodes[node.id];
    
    // Relative info for this node
    const nodeRelative = getSimplifiedRoleInterface(currentRole, node);
    const isDirectInterface = nodeRelative.relationshipBadge.includes('ממשק') || nodeRelative.relationshipBadge.includes('פיקוד') || nodeRelative.isMyNode;

    const isMatch = searchTerm.trim() !== '' && (
      node.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.holder_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isDimmed = highlightOnlyMyInterfaces && !isDirectInterface;

    return (
      <div key={node.id} className="flex flex-col items-center">
        
        {/* Node Card */}
        <div
          onClick={() => handleSelectNode(node)}
          className={`node-card cursor-pointer w-48 sm:w-56 md:w-64 p-3 sm:p-4 rounded-2xl border-2 transition-all duration-200 text-right relative select-none ${
            isSelected
              ? 'bg-white border-brand-600 shadow-xl shadow-brand-500/15 ring-4 ring-brand-500/15 scale-105 z-20'
              : nodeRelative.isMyNode
              ? 'bg-brand-50/90 border-brand-500 shadow-md ring-2 ring-brand-400 z-10'
              : isMatch
              ? 'bg-amber-50 border-amber-400 shadow-md ring-2 ring-amber-300 z-10'
              : isDirectInterface && highlightOnlyMyInterfaces
              ? 'bg-indigo-50/70 border-indigo-400 shadow-md ring-2 ring-indigo-300 z-10'
              : 'bg-white border-slate-200 hover:border-brand-300 hover:shadow-md z-10'
          } ${isDimmed ? 'opacity-40 grayscale-[50%]' : 'opacity-100'}`}
        >
          {/* Top Indicators: Level Badge + Relative Relationship Badge */}
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full ${
              level === 1
                ? 'bg-slate-900 text-white'
                : level === 2
                ? 'bg-brand-100 text-brand-800'
                : 'bg-slate-100 text-slate-700'
            }`}>
              {level === 1 ? 'מפקד יחידה' : level === 2 ? 'ראש ענף' : 'ראש מדור / מפקד'}
            </span>

            {hasChildren && (
              <button
                type="button"
                onClick={(e) => toggleCollapse(node.id, e)}
                className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition-colors"
                title={isCollapsed ? 'פתח ענף' : 'כווץ ענף'}
              >
                {isCollapsed ? '+' : '−'}
              </button>
            )}
          </div>

          {/* Relationship Badge with Current Role */}
          {currentRole && (
            <div className="mb-1">
              <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-md border ${nodeRelative.relationshipColor}`}>
                <Zap className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{nodeRelative.relationshipBadge}</span>
              </span>
            </div>
          )}

          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 mb-0.5 sm:mb-1 leading-snug">
            {node.title}
          </h4>

          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600 mb-1">
            <User className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            <span className="font-semibold">{node.holder_name}</span>
          </div>

          <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
            {node.description}
          </p>

          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px]">
            <span className="text-brand-600 font-bold hover:underline flex items-center gap-0.5">
              <span>ממשק איתי</span>
              <span>➔</span>
            </span>
            {hasChildren && (
              <span className="text-slate-400 font-medium">
                {node.children.length} כפיפים
              </span>
            )}
          </div>
        </div>

        {/* Children connector lines */}
        {hasChildren && !isCollapsed && (
          <div className="flex flex-col items-center w-full">
            {/* Vertical connector down from parent */}
            <div className="w-0.5 h-4 sm:h-6 bg-slate-300"></div>

            {/* Horizontal branch line */}
            {node.children.length > 1 ? (
              <div className="flex justify-center items-start w-full">
                <div className="flex gap-4 sm:gap-6 md:gap-8 justify-center items-start pt-4 sm:pt-6 relative">
                  {/* Top connector bar stretching between first and last child centers */}
                  <div className="absolute top-0 right-1/2 left-0 h-0.5 bg-slate-300"></div>
                  <div className="absolute top-0 left-1/2 right-0 h-0.5 bg-slate-300"></div>

                  {node.children.map((child) => (
                    <div key={child.id} className="relative flex flex-col items-center">
                      <div className="absolute -top-4 sm:-top-6 w-0.5 h-4 sm:h-6 bg-slate-300"></div>
                      {renderTreeNode(child, level + 1)}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pt-0">
                {node.children.map((child) => renderTreeNode(child, level + 1))}
              </div>
            )}
          </div>
        )}

      </div>
    );
  };

  // Render Mobile Accordion List View
  const renderMobileListItem = (node: TreeNode, depth: number = 0) => {
    const isSelected = selectedNode?.id === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = collapsedNodes[node.id];
    const nodeRelative = getSimplifiedRoleInterface(currentRole, node);

    return (
      <div key={node.id} className="w-full">
        <div
          onClick={() => handleSelectNode(node)}
          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 text-right cursor-pointer ${
            isSelected
              ? 'bg-brand-50 border-brand-500 shadow-sm ring-2 ring-brand-300'
              : nodeRelative.isMyNode
              ? 'bg-brand-50/70 border-brand-400'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
          style={{ marginRight: `${depth * 10}px` }}
        >
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
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
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs transition-colors"
                title={isCollapsed ? 'פתח כפיפים' : 'כווץ כפיפים'}
              >
                {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {hasChildren && !isCollapsed && (
          <div className="space-y-2 mt-2">
            {node.children.map((child) => renderMobileListItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2">
            <Network className="w-3.5 h-3.5" />
            <span>מבנה יחידתי וממשקים מותאמים אישית</span>
          </div>

          <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white mb-1.5">
            עץ מבנה ארגוני וממשקי עבודה
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {currentRole ? (
              <span>
                ממשקי העבודה והסנכרון מוצגים <strong>ביחס לתפקידך: {currentRole.name}</strong>.
              </span>
            ) : (
              'מפה אינטראקטיבית של המבנה היחידתי. לחץ על כל תפקיד לצפייה בפירוט הממשקים.'
            )}
          </p>
        </div>
      </div>

      {/* Search & View Mode Controls */}
      <div className="sticky top-14 md:top-16 z-30 bg-slate-50/95 backdrop-blur-md py-2.5 -mx-3.5 px-3.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="חפש תפקיד או שם מאייש בעץ..."
            className="w-full pl-4 pr-9 py-2 bg-white rounded-xl border border-slate-300 focus:border-brand-500 outline-none text-xs sm:text-sm shadow-xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter & View Mode Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Highlight My Interfaces Toggle */}
          {currentRole && (
            <button
              onClick={() => setHighlightOnlyMyInterfaces(!highlightOnlyMyInterfaces)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                highlightOnlyMyInterfaces
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>הדגש ממשקים שלי</span>
            </button>
          )}

          {/* View Mode Toggle (Chart vs Mobile List) */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'chart' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>תרשים</span>
            </button>

            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListTree className="w-3.5 h-3.5" />
              <span>רשימה</span>
            </button>
          </div>

        </div>

      </div>

      {/* Main Container: Chart Area + Side Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Org Chart / List Area */}
        {isLoading ? (
          <div className="lg:col-span-7 bg-slate-100/80 border border-slate-200/80 rounded-2xl sm:rounded-3xl p-16 text-center text-slate-500 min-h-[460px] flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-xs font-semibold">טוען מבנה ארגוני וממשקים...</p>
          </div>
        ) : viewMode === 'chart' ? (
          <div 
            ref={chartContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="lg:col-span-7 bg-slate-100/80 border border-slate-200/80 rounded-2xl sm:rounded-3xl relative overflow-x-auto overflow-y-auto overscroll-contain custom-scrollbar h-[620px] sm:h-[700px] lg:h-[760px] cursor-grab active:cursor-grabbing touch-pan-x touch-pan-y"
          >
            {/* Floating Canvas Navigation Toolbar */}
            <div className="sticky top-3 right-3 z-30 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-slate-200 shadow-md w-fit mr-auto mb-2">
              <button 
                onClick={handleZoomIn} 
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
                title="הגדל תצוגה (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-bold text-slate-600 px-1 min-w-[36px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button 
                onClick={handleZoomOut} 
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
                title="הקטן תצוגה (−)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="w-px h-3.5 bg-slate-200 mx-0.5"></div>
              <button 
                onClick={handleResetZoom} 
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                title="איפוס גודל (100%)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-3.5 bg-slate-200 mx-0.5"></div>
              <button 
                onClick={centerTree} 
                className="flex items-center gap-1 p-1.5 rounded-lg hover:bg-brand-50 text-brand-600 hover:text-brand-800 transition-colors text-[11px] font-bold"
                title="מרכז תרשים"
              >
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">מרכז</span>
              </button>
            </div>

            {/* Mobile Drag/Pan Helper Hint */}
            <div className="sm:hidden px-4 pb-2 text-[11px] text-slate-500 flex items-center gap-1.5 justify-center">
              <Move className="w-3.5 h-3.5 text-slate-400" />
              <span>ניתן לגרור לכל כיוון (למעלה/למטה/לצדדים) ולגלול חופשי</span>
            </div>

            {/* Scaled Tree Container with generous vertical & horizontal clearance */}
            <div className="w-max min-w-full min-h-full flex flex-col items-center justify-start pt-4 pb-72 px-8 sm:px-16">
              <div 
                className="flex flex-col items-center gap-10 sm:gap-14 transition-transform duration-150 origin-top"
                style={{ 
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                }}
              >
                {treeData.map((rootNode) => renderTreeNode(rootNode, 1))}
              </div>
            </div>
          </div>
        ) : (
          /* List View Area: Pure native vertical scrolling without drag interference */
          <div className="lg:col-span-7 bg-slate-100/80 border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-h-[78vh] overflow-y-auto overscroll-contain custom-scrollbar space-y-3 pb-36">
            <div className="bg-brand-50/80 border border-brand-200/90 p-3.5 rounded-2xl text-xs text-brand-900 font-medium flex items-center gap-2">
              <ListTree className="w-4 h-4 text-brand-600 shrink-0" />
              <span>תצוגת רשימה היררכית מהירה ונוחה. לחץ על כל תפקיד לצפייה בפירוט הממשק.</span>
            </div>
            <div className="space-y-2.5 pb-24">
              {treeData.map((rootNode) => renderMobileListItem(rootNode, 0))}
            </div>
          </div>
        )}

        {/* Desktop Role Details Card (Tailored to current role!) */}
        <div className="hidden lg:block lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-md sticky top-24">
          {selectedNode && relativeInterface ? (
            <div className="space-y-5">
              
              {/* Header: Node details + Relative Badge */}
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full border shadow-xs ${relativeInterface.relationshipColor}`}>
                    <Zap className="w-3.5 h-3.5" />
                    <span>{relativeInterface.relationshipBadge}</span>
                  </span>
                  
                  <span className="text-xs text-slate-400 font-semibold">
                    ביחס אליך: {currentRole?.name || 'חניך'}
                  </span>
                </div>

                <h3 className="text-xl font-black text-slate-900 leading-snug">{selectedNode.title}</h3>
                
                <div className="flex items-center gap-2 text-xs text-slate-700 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                  <User className="w-4 h-4 text-brand-600 shrink-0" />
                  <span className="font-bold">מאייש התפקיד:</span>
                  <span className="font-extrabold text-slate-900">{selectedNode.holder_name}</span>
                </div>
              </div>

              {/* 1. ממשק איתי (Interface with Me - Personalized) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-brand-600" />
                    <span>ממשק איתי (השפעה וסנכרון ישיר)</span>
                  </h4>
                  <span className="text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md">
                    מותאם אישית עבורך
                  </span>
                </div>
                <div className="p-4 bg-gradient-to-br from-brand-50/90 via-indigo-50/50 to-white rounded-2xl border border-brand-200/90 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium shadow-xs">
                  {relativeInterface.interfaceText}
                </div>
              </div>

              {/* 2. הגדרת התפקיד שלו (Role Definition & Responsibilities) */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-900 uppercase mb-2 flex items-center gap-1.5">
                  <ListTree className="w-4 h-4 text-slate-700" />
                  <span>הגדרת תפקיד ותחומי אחריות</span>
                </h4>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed font-normal">
                  {selectedNode.description}
                </div>
              </div>

            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              בחר תפקיד בעץ לצפייה בממשק ביחס לתפקידך
            </div>
          )}
        </div>

      </div>

      {/* Mobile Slide-Up Bottom Sheet Drawer with Backdrop Click Dismissal */}
      {isMobileDrawerOpen && selectedNode && relativeInterface && (
        <div 
          onClick={() => setIsMobileDrawerOpen(false)}
          className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end justify-center p-0"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full rounded-t-3xl shadow-2xl border-t border-slate-200 p-5 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 space-y-4"
          >
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2"></div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border mb-1 ${relativeInterface.relationshipColor}`}>
                  <Zap className="w-3 h-3" />
                  <span>{relativeInterface.relationshipBadge}</span>
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">{selectedNode.title}</h3>
                <p className="text-xs text-slate-600 mt-0.5">מאייש: <strong>{selectedNode.holder_name}</strong></p>
              </div>

              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. ממשק איתי (Personalized) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-600" />
                  <span>ממשק איתי (מותאם לתפקידך)</span>
                </h4>
              </div>
              <div className="p-3.5 bg-gradient-to-br from-brand-50/90 via-indigo-50/50 to-white rounded-2xl border border-brand-200/90 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                {relativeInterface.interfaceText}
              </div>
            </div>

            {/* 2. הגדרת התפקיד שלו */}
            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-xs font-black text-slate-900 uppercase mb-1.5 flex items-center gap-1.5">
                <ListTree className="w-4 h-4 text-slate-700" />
                <span>הגדרת תפקיד ותחומי אחריות</span>
              </h4>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                {selectedNode.description}
              </div>
            </div>

            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
            >
              סגור
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
