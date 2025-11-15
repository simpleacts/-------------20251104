// This file acts as a barrel file for the HomePage component,
// ensuring a consistent import path and avoiding potential resolver issues.
import HomePageComponent, { HomePage as NamedHomePage } from './components/HomePage';

export const HomePage = NamedHomePage;
export default HomePageComponent;
