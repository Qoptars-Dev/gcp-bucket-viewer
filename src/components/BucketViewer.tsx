import React, { useEffect, useState } from 'react';
import { BUCKET_URL, fetchBucketContents } from '../gcpService';

const ITEMS_PER_PAGE = 9; // Display 9 images per page
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

const BucketViewer: React.FC = () => {
  const [files, setFiles] = useState<{ name: string; url: string }[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getBucketContents = async () => {
      try {
        setLoading(true);
        const data = await fetchBucketContents();
        
        const parser = new DOMParser();
        const xml = parser.parseFromString(data, 'application/xml');
        const items = Array.from(xml.getElementsByTagName('Key'))
          .map((key) => {
            const fileName = key.textContent || '';
            const fileUrl = `${BUCKET_URL}/${fileName}`;
            return { name: fileName, url: fileUrl };
          })
          .filter(file => 
            IMAGE_EXTENSIONS.some(ext => 
              file.name.toLowerCase().endsWith(`.${ext}`)
            )
          );
        
        setFiles(items);
        setError(null);
      } catch (error) {
        setError("Failed to load images");
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    getBucketContents();
  }, []);

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredFiles.length / ITEMS_PER_PAGE);
  const currentFiles = filteredFiles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-xl">Loading images...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        <p>Error loading images: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-4">Image Gallery</h1>
      
      <input
        type="text"
        placeholder="Search images..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full p-2 mb-4 border rounded"
      />

      {filteredFiles.length === 0 ? (
        <p className="text-center py-4">No images found.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentFiles.map(({ name, url }) => (
              <div key={url} className="aspect-square relative group">
                <img
                  src={url}
                  alt={name}
                  className="w-full h-full object-cover rounded"
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <a
                    href={url}
                    download={name}
                    className="text-white bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>

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
        </>
      )}
    </div>
  );
};

export default BucketViewer;