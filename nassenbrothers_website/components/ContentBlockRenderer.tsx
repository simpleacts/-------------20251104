import React, { useMemo } from 'react';
import { AppData, ContentBlock, PageData, PrintLocationData, SpecialInkType } from '../types';

const StepCard: React.FC<{ icon: string; step: number; title: string; children: React.ReactNode }> = ({ icon, step, title, children }) => (
  <div className="bg-surface p-6 border border-border-default shadow-md flex items-start gap-6 not-prose">
    <div className="flex flex-col items-center">
        <div className="bg-primary text-white h-16 w-16 flex items-center justify-center mb-2">
            <i className={`fas ${icon} text-2xl`}></i>
        </div>
        <span className="font-bold text-text-primary">STEP {step}</span>
    </div>
    <div className="flex-1">
        <h3 className="text-xl font-bold text-primary mb-2 mt-0">{title}</h3>
        <div className="text-text-secondary space-y-2">
            {children}
        </div>
    </div>
  </div>
);

const SpecialInkCard: React.FC<{ name: string; description: string; cost: number; }> = ({ name, description, cost }) => (
    <div className="p-4 border border-border-default bg-background not-prose">
        <h4 className="font-bold text-lg text-primary mt-0">{name} (+ ¥{cost}/枚)</h4>
        <p className="!mt-1">{description}</p>
    </div>
);


const InfoSection: React.FC<{ icon: string; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <section className="bg-surface p-8 border border-border-default shadow-md">
    <h2 className="text-2xl font-bold text-primary mb-6 border-b-2 border-primary pb-3 flex items-center mt-0">
      <i className={`fas ${icon} text-primary mr-4`}></i>
      {title}
    </h2>
    <div className="text-text-primary space-y-4 prose max-w-none">
      {children}
    </div>
  </section>
);


const DynamicTableRenderer: React.FC<{ dataKey: string; appData: AppData }> = ({ dataKey, appData }) => {
    const { pricing, printLocations } = appData;

    if (dataKey === 'plateCosts' && pricing.plateCosts) {
        return (
            <table className="w-full text-left border-collapse not-prose">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-3 font-semibold">プリントサイズ・版の種類</th>
                    <th className="border border-gray-300 p-3 font-semibold text-right">料金 (1色あたり / 税抜)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(pricing.plateCosts)
                    .sort(([keyA], [keyB]) => {
                      const sizeOrder = ['10x10', '30x40', '35x50'];
                      const typeOrder = ['normal', 'decomposition'];
                      const [sizeA, typeA] = keyA.split('-');
                      const [sizeB, typeB] = keyB.split('-');
                      if (typeOrder.indexOf(typeA) !== typeOrder.indexOf(typeB)) return typeOrder.indexOf(typeA) - typeOrder.indexOf(typeB);
                      return sizeOrder.indexOf(sizeA) - sizeOrder.indexOf(sizeB);
                    })
                    .map(([key, value]: [string, { cost: number; surchargePerColor: number }]) => {
                      const [size, type] = key.split('-');
                      const typeLabel = type === 'decomposition' ? '分解版' : '通常版';
                      return (
                        <tr key={key}>
                          <td className="border border-gray-300 p-3">{`${size} (${typeLabel})`}</td>
                          <td className="border border-gray-300 p-3 text-right">¥{value.cost.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                </tbody>
            </table>
        );
    }
     if (dataKey === 'printLocations' && printLocations) {
        const locationGroups = printLocations.reduce((acc, loc) => {
            if (!acc[loc.groupName]) acc[loc.groupName] = [];
            acc[loc.groupName].push(loc);
            return acc;
        }, {} as Record<string, PrintLocationData[]>);
        return (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start not-prose">
                <div>
                    <img src="https://via.placeholder.com/500x500.png?text=Print+Locations" alt="プリント箇所" className="w-full border border-gray-300"/>
                </div>
                <div className="space-y-4">
                  {Object.entries(locationGroups).map(([group, locations]: [string, PrintLocationData[]]) => (
                    <div key={group}>
                      <h4 className="font-bold text-lg text-primary">{group}</h4>
                      <ul className="list-disc list-inside ml-2">
                        {locations.map(loc => <li key={loc.locationId}>{loc.label}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
        );
     }
    return <div className="text-red-500 font-bold">[動的テーブル: {dataKey} のデータが見つかりません]</div>;
};


export const ContentBlockRenderer: React.FC<{ block: ContentBlock; appData: AppData }> = ({ block, appData }) => {
    switch (block.type) {
        case 'h1':
            return <h1 className="text-4xl font-extrabold tracking-tight text-center mb-12">{block.content}</h1>;
        case 'h2':
            return <h2 className="text-2xl font-bold border-b pb-2 mb-4">{block.content}</h2>;
        case 'h3':
            return <h3 className="text-xl font-semibold mt-8 mb-2">{block.content}</h3>;
        case 'p':
            return <p dangerouslySetInnerHTML={{ __html: block.content || '' }}></p>;
        case 'ul':
            return (
                <ul>
                    {block.items?.map((item, index) => <li key={index} dangerouslySetInnerHTML={{ __html: item }}></li>)}
                </ul>
            );
        case 'ol':
             return (
                <ol>
                    {block.items?.map((item, index) => <li key={index} dangerouslySetInnerHTML={{ __html: item }}></li>)}
                </ol>
            );
        case 'section-break':
            return <hr className="my-8 border-border-default" />;
        case 'dynamic-table':
            return block.data_key ? <DynamicTableRenderer dataKey={block.data_key} appData={appData} /> : null;
        case 'custom-component':
            if (block.component === 'StepCard' && block.props) {
                return <StepCard {...block.props}>{block.props.content}</StepCard>;
            }
            if (block.component === 'SpecialInkCard' && block.props) {
                return <SpecialInkCard {...block.props} />;
            }
             if (block.component === 'InfoSection' && block.props) {
                return (
                    <InfoSection {...block.props}>
                        {block.props.children?.map((childBlock: ContentBlock) => (
                            <ContentBlockRenderer key={childBlock.id} block={childBlock} appData={appData} />
                        ))}
                    </InfoSection>
                );
            }
            return <div>[Unsupported Component: {block.component}]</div>;
        default:
            return null;
    }
};

export const PageRenderer: React.FC<{ pageData: PageData; appData: AppData }> = ({ pageData, appData }) => {
  return (
    <>
      {pageData.blocks.map(block => (
        <ContentBlockRenderer key={block.id} block={block} appData={appData} />
      ))}
    </>
  );
};
