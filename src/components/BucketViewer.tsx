import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { BUCKET_URL, fetchBucketContents } from '../gcpService';
import LazyImage from './LazyImage';

const ITEMS_PER_PAGE = 9;
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const DOWNLOADABLE_EXTENSIONS = [...IMAGE_EXTENSIONS, 'csv', 'pdf', 'xlsx', 'docx', 'txt'];

interface FileItem {
  name: string;
  url: string;
  type: 'image' | 'file';
  extension: string;
}

interface FolderItem {
  name: string;
  path: string;
  files: FileItem[];
  subfolders: FolderItem[];
}

const FileIcon: React.FC<{ extension: string }> = React.memo(({ extension }) => {
  const iconMap: { [key: string]: string } = {
    pdf: '📄',
    csv: '📊',
    xlsx: '📊',
    docx: '📝',
    txt: '📄',
    image: '🖼️',
  };
  return <span>{iconMap[IMAGE_EXTENSIONS.includes(extension) ? 'image' : extension] || '📄'}</span>;
});

const FolderCard: React.FC<{
  folder: FolderItem;
  onClick: () => void;
}> = React.memo(({ folder, onClick }) => (
  <button
    onClick={onClick}
    className="p-4 border rounded hover:bg-gray-50 transition-colors text-left"
  >
    <div className="flex items-center">
      <span className="mr-2">📁</span>
      <div>
        <h3 className="font-medium">{folder.name}</h3>
        <p className="text-sm text-gray-500">
          {folder.files.length} files, {folder.subfolders.length} folders
        </p>
      </div>
    </div>
  </button>
));

const FileCard: React.FC<{
  file: FileItem;
}> = React.memo(({ file }) => (
  <div className="relative group">
    {file.type === 'image' ? (
      <div className="aspect-square">
        <LazyImage
          src={file.url}
          alt={file.name}
          className="rounded"
        />
      </div>
    ) : (
      <div className="aspect-square border rounded flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FileIcon extension={file.extension} />
          <p className="mt-2 text-sm">{file.name}</p>
        </div>
      </div>
    )}
    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
      <a
        href={file.url}
        download={file.name}
        className="text-white bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 transition-colors"
      >
        Download
      </a>
    </div>
  </div>
));

const BucketViewer: React.FC = () => {
  const [rootFolder, setRootFolder] = useState<FolderItem | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getFileType = useCallback((fileName: string): 'image' | 'file' => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    return IMAGE_EXTENSIONS.includes(extension) ? 'image' : 'file';
  }, []);

  const getFileExtension = useCallback((fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }, []);

  const buildFolderStructure = useCallback((files: string[]): FolderItem => {
    const root: FolderItem = {
      name: 'root',
      path: '',
      files: [],
      subfolders: []
    };

    const folderCache = new Map<string, FolderItem>();
    folderCache.set('', root);

    files.forEach(filePath => {
      const parts = filePath.split('/').filter(part => part);
      let currentPath = '';

      parts.forEach((part, index) => {
        const isLastPart = index === parts.length - 1;
        const newPath = currentPath ? `${currentPath}/${part}` : part;

        if (isLastPart) {
          const extension = getFileExtension(part);
          if (DOWNLOADABLE_EXTENSIONS.includes(extension)) {
            const parentFolder = folderCache.get(currentPath)!;
            parentFolder.files.push({
              name: part,
              url: `${BUCKET_URL}/${filePath}`,
              type: getFileType(part),
              extension
            });
          }
        } else {
          if (!folderCache.has(newPath)) {
            const newFolder: FolderItem = {
              name: part,
              path: newPath,
              files: [],
              subfolders: []
            };
            const parentFolder = folderCache.get(currentPath)!;
            parentFolder.subfolders.push(newFolder);
            folderCache.set(newPath, newFolder);
          }
          currentPath = newPath;
        }
      });
    });

    return root;
  }, [getFileExtension, getFileType]);

  useEffect(() => {
    const getBucketContents = async () => {
      try {
        setLoading(true);
        const data = await fetchBucketContents();
        
        const parser = new DOMParser();
        const xml = parser.parseFromString(data, 'application/xml');
        const items = Array.from(xml.getElementsByTagName('Key')).map((key) => key.textContent || '');

        const folderStructure = buildFolderStructure(items);
        setRootFolder(folderStructure);
        setError(null);
      } catch (error) {
        setError("Failed to load bucket contents");
      } finally {
        setLoading(false);
      }
    };

    getBucketContents();
  }, [buildFolderStructure]);

  const currentFolder = useMemo(() => {
    if (!rootFolder) return null;
    return currentPath.reduce((folder, pathPart) => {
      return folder?.subfolders.find(f => f.name === pathPart) || null;
    }, rootFolder);
  }, [rootFolder, currentPath]);

  const { paginatedFiles, totalPages } = useMemo(() => {
    const files = currentFolder?.files || [];
    return {
      paginatedFiles: files.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
      totalPages: Math.ceil(files.length / ITEMS_PER_PAGE)
    };
  }, [currentFolder, currentPage]);

  const handleFolderClick = useCallback((folderName: string) => {
    setCurrentPath(prev => [...prev, folderName]);
    setCurrentPage(1);
  }, []);

  const handlePathClick = useCallback((index: number) => {
    setCurrentPath(prev => prev.slice(0, index));
    setCurrentPage(1);
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <p className="text-xl">Loading...</p>
    </div>;
  }

  if (error) {
    return <div className="text-red-500 p-4"><p>{error}</p></div>;
  }

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-4">File Explorer</h1>
      
      {/* Breadcrumb navigation */}
      <div className="flex flex-wrap items-center space-x-2 mb-4 text-sm text-gray-600">
        <span 
          className="cursor-pointer hover:text-blue-500"
          onClick={() => handlePathClick(-1)}
        >
          Root
        </span>
        {currentPath.map((path, index) => (
          <React.Fragment key={path}>
            <span>/</span>
            <span 
              className="cursor-pointer hover:text-blue-500"
              onClick={() => handlePathClick(index)}
            >
              {path}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Subfolders */}
      {currentFolder?.subfolders.length ? (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Folders</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentFolder.subfolders.map(folder => (
              <FolderCard
                key={folder.path}
                folder={folder}
                onClick={() => handleFolderClick(folder.name)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Files */}
      {paginatedFiles.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Files</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedFiles.map(file => (
              <FileCard key={file.url} file={file} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-6 space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
              >
                Previous
              </button>
              <span className="mx-4">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {!currentFolder?.subfolders.length && !paginatedFiles.length && (
        <p className="text-gray-500 text-center py-8">This folder is empty.</p>
      )}
    </div>
  );
};

export default BucketViewer;