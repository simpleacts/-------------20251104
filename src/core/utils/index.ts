/**
 * Barrel export for core utilities
 */

// brandAccess
export {
    getBrandIdForProduct, getBrandNameById, getBrandNameForProduct
} from './brandAccess';

// csvPathResolver
export {
    getCsvPath,
    isToolSpecificTable
} from './csvPathResolver';

// databaseAccessControl
export {
    getDefaultAllowedOperations, getToolAccessControl,
    isOperationAllowed,
    updateDatabase
} from './databaseAccessControl';
export type {
    DatabaseOperation,
    ToolAccessControl
} from './databaseAccessControl';

// deletedItemsTracker
export {
    clearAllDeletedItems, clearDeletedItems, filterDeletedItems, getAllDeletedItems, getDeletedItems, trackDeletedItem
} from './deletedItemsTracker';

// dependencyMigration
export {
    detectDefinitionDifferences, generateDependenciesFromManualDefinition,
    migrateAllManualDefinitionsToDependencies
} from './dependencyMigration';

// errorAnalyzer
export {
    analyzeError
} from './errorAnalyzer';
export type {
    ErrorAnalysis
} from './errorAnalyzer';

// manufacturerTableAccess
export {
    findInAllManufacturerTables, findInManufacturerTable, getAllManufacturerTableData, getManufacturerTable,
    getManufacturerTableData, getTable,
    updateDatabaseWithNewData
} from './manufacturerTableAccess';

// stockProductInfo
export {
    getColorsFromStock, getPricesFromStock, getProductDetailsFromStock, getProductInfoFromStock, getProductsMasterFromStock, getSizesFromStock
} from './stockProductInfo';
export type {
    ColorInfo, PriceInfo, ProductInfoFromStock, SizeInfo, StockQuantityInfo
} from './stockProductInfo';

// tableNames
export { getManufacturerFileName, getManufacturerTableName, isManufacturerDependentTable, parseManufacturerTableName } from '../config/tableNames';

