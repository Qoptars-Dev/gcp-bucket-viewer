/* eslint-disable @typescript-eslint/no-unused-vars */
// // src/components/BucketViewer.tsx

import React, { useEffect, useState } from 'react';
import { BUCKET_URL, fetchBucketContents } from '../gcpService';


const ITEMS_PER_PAGE = 15; // Display 5 items per page

// Define icons for file types (you can use FontAwesome, or any icon library)
const fileIcons: { [key: string]: string } = {
  pdf: '📄', // PDF Icon
  doc: '📄', // Word Document Icon
  docx: '📄', // Word Document Icon
  xls: '📊', // Excel Spreadsheet Icon
  xlsx: '📊', // Excel Spreadsheet Icon
  png: '🖼️', // Image Icon
  jpg: '🖼️', // Image Icon
  jpeg: '🖼️', // Image Icon
  mp4: '🎥', // Video Icon
  txt: '📜', // Text File Icon
  default: '📁', // Default file icon
};


// Helper function to get file extension
const getFileExtension = (fileName: string) => {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
};


  const getIconForFile = (fileName: string) => {
    const ext = getFileExtension(fileName);
    return fileIcons[ext] || fileIcons['default']; // Return specific icon or default icon
  };


const BucketViewer: React.FC = () => {
  const [files, setFiles] = useState<{ name: string; url: string }[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [folder, setFolder] = useState<string>(''); // State to track current folder
  const [searchQuery, setSearchQuery] = useState<string>(''); // State to store search query
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getBucketContents = async () => {
      try {
        setLoading(true);
        const data = await fetchBucketContents();

        const parser = new DOMParser();
        const xml = parser.parseFromString(data, 'application/xml');
        const items = Array.from(xml.getElementsByTagName('Key')).map((key) => {
          const fileName = key.textContent || '';
          const fileUrl = `${BUCKET_URL}/${fileName}`;
          return { name: fileName, url: fileUrl };
        });
        setFiles(items);
        setError(null);
      } catch (error) {
        setError("error");
      } finally {
        setLoading(false);
      }
    };

    getBucketContents();
  }, [folder]);

  // Filter files based on search query
  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredFiles.length / ITEMS_PER_PAGE);
  const currentFiles = filteredFiles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleFolderClick = (folderName: string) => {
    setFolder(folderName); // Navigate into the folder
    setCurrentPage(1);
  };

  if (loading) {
    return <p>Loading bucket contents...</p>;
  }

  if (error) {
    return <p>Error loading bucket contents: {error}</p>;
  }

  return (
    <div>
      <h1>GCP Bucket Contents</h1>
      {folder && (
        <button onClick={() => setFolder('')}>Back to root folder</button>
      )}

      {/* Search Input */}
      <input
        type="text"
        placeholder="Search files..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ marginBottom: '20px', padding: '10px', width: '100%' }}
      />

      {filteredFiles.length === 0 ? (
        <p>No files found for the search query.</p>
      ) : (
        <div>
          {currentFiles.map(({ name, url }) => (
            <div key={url} style={{ margin: '10px 0', display: 'flex', alignItems: 'center' }}>
              {name.endsWith('/') ? (
                <button onClick={() => handleFolderClick(name)}>
                  📁 {name} (Folder)
                </button>
              ) : (
                <>
                 <span style={{ marginRight: '10px' }}>{getIconForFile(name)}</span>
                  <span style={{ marginRight: '10px' }}>{name}</span>
                  <a href={url} download={name}>
                    Download
                  </a>
                </>
              )}
            </div>
          ))}

          {/* Pagination controls */}
          <div style={{ marginTop: '20px' }}>
            <button onClick={handlePreviousPage} disabled={currentPage === 1}>
              Previous
            </button>
            <span style={{ margin: '0 10px' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button onClick={handleNextPage} disabled={currentPage === totalPages}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BucketViewer;