declare const gapi: any;
declare const google: any;

let tokenClient: any = null;
let onAuthChange: ((isSignedIn: boolean) => void) | null = null;

export const loadGapi = (callback: () => void) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => gapi.load('client', callback);
    document.body.appendChild(script);
};

export const initClient = (
    config: { apiKey: string, clientId: string, scopes: string[] },
    onReady: () => void,
    onAuthChangeCallback?: (isSignedIn: boolean) => void
) => {
    const { apiKey, clientId, scopes } = config;

    if (!apiKey || !clientId) {
        console.error("Google API Key or Client ID was not provided to initClient.");
        return;
    }

    gapi.client.init({
        apiKey: apiKey,
        discoveryDocs: [
            'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
            'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'
        ],
    }).then(() => {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: scopes.join(' '),
            callback: (tokenResponse: any) => {
                if (tokenResponse && tokenResponse.access_token) {
                    gapi.client.setToken(tokenResponse);
                    if (onAuthChange) onAuthChange(true);
                } else {
                    console.error("No access token received.");
                    if (onAuthChange) onAuthChange(false);
                }
            },
        });
        onReady();
    }).catch((error: any) => {
        console.error("Error initializing GAPI client: ", error);
    });
    
    if (onAuthChangeCallback) {
        onAuthChange = onAuthChangeCallback;
    }
};

export const signIn = () => {
    if (tokenClient) {
        if (gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            tokenClient.requestAccessToken({ prompt: '' });
        }
    } else {
        console.error("Token client not initialized.");
    }
};

export const signOut = () => {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            gapi.client.setToken(null);
            if (onAuthChange) onAuthChange(false);
        });
    }
};

export const findOrCreateFolder = async (name: string, parentId: string): Promise<string | null> => {
    try {
        let response = await gapi.client.drive.files.list({
            q: `'${parentId}' in parents and trashed=false and name='${name}' and mimeType='application/vnd.google-apps.folder'`,
            fields: 'files(id, name)',
        });
        
        if (response.result.files.length > 0) {
            return response.result.files[0].id;
        } else {
            const fileMetadata = {
                name: name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId],
            };
            response = await gapi.client.drive.files.create({
                resource: fileMetadata,
                fields: 'id',
            });
            return response.result.id;
        }
    } catch (error: any) {
        const errorMessage = error?.result?.error?.message || (error instanceof Error ? error.message : "An unknown error occurred while finding or creating a folder.");
        console.error("Error finding or creating folder: ", errorMessage, error);
        return null;
    }
};

export const getFolderLink = (folderId: string) => `https://drive.google.com/drive/folders/${folderId}`;

export const uploadFile = async (file: File, folderId: string, fileName?: string): Promise<string | null> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = async () => {
            const fileContent = reader.result;
            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";

            const metadata = {
                name: fileName || file.name,
                mimeType: file.type,
                parents: [folderId]
            };

            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: ' + file.type + '\r\n' +
                'Content-Transfer-Encoding: base64\r\n' +
                '\r\n' +
                btoa(String.fromCharCode(...new Uint8Array(fileContent as ArrayBuffer))) +
                close_delim;
            
            try {
                const response = await gapi.client.request({
                    path: '/upload/drive/v3/files',
                    method: 'POST',
                    params: { uploadType: 'multipart' },
                    headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
                    body: multipartRequestBody
                });
                resolve(response.result.id);
            } catch (error: any) {
                const errorMessage = error?.result?.error?.message || (error instanceof Error ? error.message : "An unknown error occurred while uploading a file.");
                console.error("Error uploading file: ", errorMessage, error);
                reject(new Error(errorMessage));
            }
        };
    });
};

export const listFiles = async (folderId: string): Promise<any[] | null> => {
    try {
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, mimeType, webViewLink)',
            orderBy: 'name',
        });
        return response.result.files;
    } catch (error: any) {
        const errorMessage = error?.result?.error?.message || (error instanceof Error ? error.message : "An unknown error occurred while listing files.");
        console.error("Error listing files: ", errorMessage, error);
        throw new Error(errorMessage);
    }
};

export const downloadFile = async (fileId: string): Promise<Blob> => {
    try {
        const accessToken = gapi.client.getToken().access_token;
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            let errorBody = 'Could not read error response body.';
            try {
                const errorJson = await response.json();
                errorBody = errorJson?.error?.message || JSON.stringify(errorJson);
            } catch (e) {
                // If parsing as JSON fails, try getting the raw text.
                errorBody = await response.text();
            }
            throw new Error(`Failed to download file: ${response.statusText} (${response.status}). Body: ${errorBody}`);
        }
        
        return await response.blob();
    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while downloading the file.";
        console.error("Error downloading file: ", errorMessage, error);
        throw new Error(errorMessage);
    }
};