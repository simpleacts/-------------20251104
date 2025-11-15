import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PrintLocation, PrintDesign, CostDetails, PrintLocationData } from '../types';


interface CostSummaryProps {
  totalCost: number; // subtotal
  shippingCost: number;
  tax: number;
  totalCostWithTax: number;
  costPerShirt: number;
  quantity: number;
  tshirtCost: number;
  setupCost: number;
  printCost: number;
  printDesigns: PrintDesign[];
  costDetails: CostDetails;
  printLocations: PrintLocationData[];
  isBringInMode?: boolean;
  uiText: Record<string, string>;
}

const HelpTooltip: React.FC<{ text: string, ariaLabel: string }> = ({ text, ariaLabel }) => {
    const [isOpen, setIsOpen] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className="relative inline-flex ml-2" ref={tooltipRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="text-text-secondary hover:text-secondary focus:outline-none transition-colors"
                aria-label={ariaLabel}
            >
                <i className="fas fa-info-circle"></i>
            </button>
            {isOpen && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs shadow-lg z-10">
                    {text}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gray-900"></div>
                </div>
            )}
        </div>
    );
};

const DetailRow: React.FC<{ label: string; value: number; subDetails?: React.ReactNode; isOpen?: boolean; onToggle?: () => void; isCollapsible?: boolean; helpText?: string; uiText: Record<string, string>; }> = 
({ label, value, subDetails, isOpen, onToggle, isCollapsible = false, helpText, uiText }) => (
    <div>
        <div 
            className={`flex justify-between items-center text-sm ${onToggle ? 'cursor-pointer hover:bg-background-subtle px-2 py-1 -mx-2' : ''}`}
            onClick={onToggle}
            role={onToggle ? 'button' : undefined}
            tabIndex={onToggle ? 0 : -1}
            onKeyPress={onToggle ? (e) => (e.key === 'Enter' || e.key === ' ') && onToggle() : undefined}
            aria-expanded={isOpen}
        >
            <div className="flex items-center">
                <span>{label}</span>
                {helpText && <HelpTooltip text={helpText} ariaLabel={uiText['costSummary.helpTooltip.ariaLabel'] || '詳細情報'} />}
                {isCollapsible && (
                    <i className={`fas fa-chevron-down text-xs text-gray-400 ml-2 transition-transform transform ${isOpen ? 'rotate-180' : ''}`}></i>
                )}
            </div>
            <span className="font-medium">¥{value.toLocaleString()}</span>
        </div>
        {isOpen && subDetails && (
            <div className="mt-1 pl-4 pr-2 py-2 bg-surface border border-border-default">
                {subDetails}
            </div>
        )}
    </div>
);


export const CostSummary: React.FC<CostSummaryProps> = ({ totalCost, shippingCost, tax, totalCostWithTax, costPerShirt, quantity, tshirtCost, setupCost, printCost, printDesigns, costDetails, printLocations, isBringInMode = false, uiText }) => {
  const [isPrintCostDetailsOpen, setIsPrintCostDetailsOpen] = useState(false);
  const [isSetupCostDetailsOpen, setIsSetupCostDetailsOpen] = useState(false);
  
  const [isStickyHeaderVisible, setIsStickyHeaderVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const getPrintLocationGroup = useCallback((locationId: string): string => {
    return printLocations.find(loc => loc.locationId === locationId)?.groupName || '';
  }, [printLocations]);

  const getPrintLocationLabel = useCallback((locationId: string): string => {
    return printLocations.find(loc => loc.locationId === locationId)?.label || '';
  }, [printLocations]);

  useEffect(() => {
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
       if (window.innerWidth < 1024) { // lg breakpoint
        setIsStickyHeaderVisible(!entry.isIntersecting && entry.boundingClientRect.y < 0);
      } else {
        setIsStickyHeaderVisible(false);
      }
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      threshold: 0,
    });

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsStickyHeaderVisible(false);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const stickyHeader = (
    <div
      className={`fixed top-16 left-0 right-0 bg-surface/90 backdrop-blur-sm border-b border-border-default shadow-md p-3 z-20 transition-transform duration-300 ease-in-out lg:hidden ${
        isStickyHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
      aria-hidden={!isStickyHeaderVisible}
    >
      <div className="container mx-auto px-4 flex justify-between items-baseline">
        <span className="text-text-secondary text-sm font-semibold">{uiText['costSummary.perShirtLabel']}</span>
        <span className="text-xl font-bold text-accent">
          {quantity > 0 ? `¥${costPerShirt.toLocaleString()}` : '-'}
        </span>
      </div>
    </div>
  );

  const printCostSubDetails = (
    <div className="space-y-2 text-xs text-text-secondary">
        <div className="flex justify-between items-center">
            <span>{uiText['costSummary.details.basePrint']}</span>
            <span className="text-text-primary font-medium">¥{costDetails.printCostDetail.base.toLocaleString()}</span>
        </div>
        {costDetails.printCostDetail.byItem > 0 && (
            <div className="flex justify-between items-center">
                <span>{uiText['costSummary.details.itemSurcharge']}</span>
                <span className="text-text-primary font-medium">¥{costDetails.printCostDetail.byItem.toLocaleString()}</span>
            </div>
        )}
        {costDetails.printCostDetail.byLocation > 0 && (
             <div className="flex justify-between items-center">
                <span>{uiText['costSummary.details.locationSurcharge']}</span>
                <span className="text-text-primary font-medium">¥{costDetails.printCostDetail.byLocation.toLocaleString()}</span>
            </div>
        )}
        {costDetails.printCostDetail.bySize > 0 && (
             <div className="flex justify-between items-center">
                <span>{uiText['costSummary.details.sizeSurcharge']}</span>
                <span className="text-text-primary font-medium">¥{costDetails.printCostDetail.bySize.toLocaleString()}</span>
            </div>
        )}
        {costDetails.printCostDetail.byInk > 0 && (
             <div className="flex justify-between items-center">
                <span>{uiText['costSummary.details.inkSurcharge']}</span>
                <span className="text-text-primary font-medium">¥{costDetails.printCostDetail.byInk.toLocaleString()}</span>
            </div>
        )}
        {costDetails.printCostDetail.byPlateType > 0 && (
             <div className="flex justify-between items-center">
                <span>{uiText['costSummary.details.plateSurcharge']}</span>
                <span className="text-text-primary font-medium">¥{costDetails.printCostDetail.byPlateType.toLocaleString()}</span>
            </div>
        )}
    </div>
  );

  const setupCostSubDetails = (
     <div className="space-y-2 text-xs text-text-secondary">
      {printDesigns.map((design, index) => {
        if (!design.location || design.colors === 0) return null;
        const costForDesign = costDetails.setupCostDetail[design.id] ?? 0;
        const groupName = getPrintLocationGroup(design.location);
        const locationLabel = getPrintLocationLabel(design.location) || uiText['costSummary.details.setupCostLocationUnselected'];
        
        const labelText = uiText['costSummary.details.setupCostDesign']
            .replace('{{index}}', (index + 1).toString())
            .replace('{{group}}', groupName)
            .replace('{{label}}', locationLabel)
            .replace('{{size}}', design.size)
            .replace('{{colors}}', design.colors.toString());

        return (
          <div key={design.id} className="flex justify-between items-center">
            <span>{labelText}</span>
            <span className="text-text-primary font-medium">¥{costForDesign.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );

  const tshirtLabel = isBringInMode ? uiText['costSummary.tshirtCostBringInLabel'] : uiText['costSummary.tshirtCostLabel'];

  return (
    <>
      {stickyHeader}
      <div ref={sentinelRef} />
      <div className="bg-background-subtle p-6 border border-border-default">
        <h2 className="text-xl font-bold text-text-primary mb-4 border-b border-border-default pb-2">{uiText['costSummary.title']}</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-baseline">
            <span className="text-text-secondary">{uiText['costSummary.perShirtLabel']}</span>
            <span className="text-xl font-semibold text-accent">
              {quantity > 0 ? `¥${costPerShirt.toLocaleString()}` : '-'}
            </span>
          </div>

          {quantity > 0 && (
            <div className="pt-4 space-y-2">
              <h3 className="text-md font-semibold text-text-secondary mb-2">{uiText['costSummary.breakdownTitle']}</h3>
              <div className="text-text-primary space-y-2">
                  <DetailRow label={tshirtLabel} value={tshirtCost} helpText={isBringInMode ? uiText['costSummary.tshirtCostBringInHelp'] : undefined} uiText={uiText} />
                  <DetailRow 
                      label={uiText['costSummary.printCostLabel']}
                      value={printCost} 
                      subDetails={printCostSubDetails}
                      isOpen={isPrintCostDetailsOpen}
                      onToggle={() => setIsPrintCostDetailsOpen(!isPrintCostDetailsOpen)}
                      isCollapsible={printCost > 0}
                      helpText={uiText['costSummary.printCostHelp']}
                      uiText={uiText}
                  />
                  <DetailRow 
                      label={uiText['costSummary.setupCostLabel']}
                      value={setupCost}
                      subDetails={setupCostSubDetails}
                      isOpen={isSetupCostDetailsOpen}
                      onToggle={() => setIsSetupCostDetailsOpen(!isSetupCostDetailsOpen)}
                      isCollapsible={setupCost > 0}
                      helpText={uiText['costSummary.setupCostHelp']}
                      uiText={uiText}
                  />
              </div>
            </div>
          )}
          
          <div className="space-y-2 pt-4 border-t border-border-default mt-4">
            <div className="flex justify-between items-baseline text-sm">
              <span className="text-text-secondary">{uiText['costSummary.subtotalLabel']}</span>
              <span className="font-medium text-text-primary">
                {quantity > 0 ? `¥${totalCost.toLocaleString()}` : '-'}
              </span>
            </div>
            <div className="flex justify-between items-baseline text-sm">
              <span className="text-text-secondary">{uiText['costSummary.shippingCostLabel']}</span>
              <span className="font-medium text-text-primary">
                {quantity > 0 ? (shippingCost > 0 ? `¥${shippingCost.toLocaleString()}` : uiText['common.free']) : '-'}
              </span>
            </div>
            <div className="flex justify-between items-baseline text-sm">
              <span className="text-text-secondary">{uiText['costSummary.taxLabel']}</span>
              <span className="font-medium text-text-primary">
                {quantity > 0 ? `¥${tax.toLocaleString()}` : '-'}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-border-default mt-2">
              <span className="text-text-secondary font-bold">{uiText['costSummary.totalLabel']}</span>
              <span className="text-3xl font-bold text-primary">
                {quantity > 0 ? `¥${totalCostWithTax.toLocaleString()}` : '-'}
              </span>
            </div>
          </div>

        </div>
        <p className="text-xs text-text-secondary mt-6 space-y-1">
            <span>{uiText['costSummary.notes.line1']}</span>
            <br />
            <span>{uiText['costSummary.notes.line2']}</span>
            <br />
            <span>{uiText['costSummary.notes.line3']?.replace('{{price}}', (50000).toLocaleString())}</span>
        </p>
      </div>
    </>
  );
};
