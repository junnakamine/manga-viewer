import React, { useState, useEffect } from "react";
import axios from 'axios';
import './App.css';
import { click } from "@testing-library/user-event/dist/click";

const MangaList = () => {
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [curMangaIndex, setCurMangaIndex] = useState(0);
  const [curChapterIndex, setCurChapterIndex] = useState(0);
  const [chapterDetails, setChapterDetails] = useState<ChapterDetails | null>(null);
  const [page, setPage] = useState(0)
  const [isDragging, setIsDragging] = useState(false);

  // Interfaces when retrieving data 
  interface Manga {
    title: string;
    chapter_ids: number[];
  }

  interface ChapterDetails {
    id: number;
    title: string;
    pages: Page[];
  }

  interface Page {
    id: number;
    page_index: number;
    image: {
      id: number;
      file: string;
      width: number;
      height: number;
    };
  }

  // If different manga is chosen
  const handleManga = (index: number) => {
    setCurMangaIndex(index);
    setCurChapterIndex(0);
    setPage(0)
    const progress = document.querySelector('.seekbar-progress') as HTMLDivElement;
    progress.style.left = `0%`;
  };

  // if different chapter is chosen
  const handleChapter = (index: number) => {
    setCurChapterIndex(index);
    setPage(0)
    const progress = document.querySelector('.seekbar-progress') as HTMLDivElement;
    progress.style.left = `0%`;
  };

  // If clicked on the manga art, then handle the logic to move to another page or chapter
  const handleClick = (direction: number) => {
    const potentialPage = page + direction;
    const maxChapterIndex = mangas[curMangaIndex].chapter_ids.length - 1;

    // If it is first page and user is trying to go to previous page, then go to previous chapter
    if (potentialPage < 0 && curChapterIndex > 0) {
      const prevChapterIndex = curChapterIndex - 1;
      const prevChapterID = mangas[curMangaIndex]?.chapter_ids[prevChapterIndex]
      if (prevChapterID) {
        axios.get(`http://52.195.171.228:8080/chapters/${prevChapterID}/`)
          .then(response => {
            setChapterDetails(response.data);
            const lastPageIndex = response.data.pages.length - 1;
            setCurChapterIndex(prevChapterIndex);
            setPage(lastPageIndex);
          })
          .catch(err => {
            console.error(err);
          });
      }
      // If it is last page and user is trying to go next page, then go to next chapter
    } else if (chapterDetails && potentialPage >= chapterDetails?.pages.length && curChapterIndex < maxChapterIndex) {
      const nextChapterIndex = curChapterIndex + 1;
      setCurChapterIndex(nextChapterIndex)
      setPage(0)
      // Normal scrolling left and right 
    } else if (chapterDetails && potentialPage >= 0 && potentialPage <= chapterDetails?.pages.length - 1) {
      setPage(potentialPage)
    }
  }

  // Handles if user clicks on manga art: https://stackoverflow.com/questions/15685708/determining-if-mouse-click-happened-in-left-or-right-half-of-div
  const onClick = (e: any) => {
    const clickTarget = e.target;
    const clickTargetWidth = clickTarget.offsetWidth;
    const xCoordInClickTarget = e.clientX - clickTarget.getBoundingClientRect().left;
    if (clickTargetWidth / 2 > xCoordInClickTarget) {
      // Click left 
      handleClick(1)
    } else {
      handleClick(-1)
    }
  }

  // When the user clicks on the seekbar circle 
  const handleDragStart = (e: any) => {
    setIsDragging(true);
  }

  // When the user stops clicking on seekbar circle 
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Handles when user drags along the seekbar 
  const handleDrag = (e: any) => {
    const seekbar = document.querySelector('.seekbar-container') as HTMLDivElement;
    const clickTargetWidth = seekbar.offsetWidth;
    const xCoordInClickTarget = e.clientX - seekbar.getBoundingClientRect().left;
    // Makes sure user is dragging between the seekbar container 
    if (isDragging && chapterDetails && xCoordInClickTarget >= 0 && xCoordInClickTarget <= clickTargetWidth) {
      // This ensures that percentage doesn't reach 1 or page will equal chapterDetails.pages.length causing an error 
      const maxPercentage = 0.9999;
      const percentage = Math.min(Math.max(xCoordInClickTarget / clickTargetWidth, 0), maxPercentage);
      const updatedPage = Math.floor(percentage * (chapterDetails.pages.length));
      const progress = document.querySelector('.seekbar-progress') as HTMLDivElement;
      if (progress) {
        // Moves the seekbar circle across based on position of cursor 
        progress.style.left = `${percentage * 100}%`;
        setPage(updatedPage)
      }
    }
  }

  // Gets the list of books data
  useEffect(() => {
    axios.get('http://52.195.171.228:8080/books/')
      .then(response => {
        setMangas(response.data);
      })
      .catch(err => {
        console.log(err);
      });
  }, []);

  // If manga, chapter, or manga data is changed then update the chapter details  
  useEffect(() => {
    const chapterId = mangas[curMangaIndex]?.chapter_ids[curChapterIndex];
    if (chapterId) {
      axios.get(`http://52.195.171.228:8080/chapters/${chapterId}/`)
        .then(response => {
          setChapterDetails(response.data);
        })
        .catch(err => {
          console.error(err);
        });
    }
  }, [curMangaIndex, curChapterIndex, mangas]);

  // Tracks when user is clicking on seekbar 
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDrag);
      window.addEventListener("mouseup", handleDragEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleDrag);
      window.removeEventListener("mouseup", handleDragEnd);
    }
  }, [isDragging])

  return (
    <div className="home">
      <div className='home-manga'>
        <div className="home-manga-name">
          {mangas.map((manga, index) => (
            <button
              onClick={() => handleManga(index)}
              className={`home-book-manga-button ${curMangaIndex == index ? "manga-button-active" : ""}`}
            >
              {manga['title']}
            </button>
          ))}
        </div>
        <div className="home-manga-name">
          {mangas[curMangaIndex]?.chapter_ids.map((chapter, index) => (
            <button
              onClick={() => handleChapter(index)}
              className={`home-book-manga-button ${curChapterIndex == index ? "manga-button-active" : ""}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <div className="home-manga-box">
          {chapterDetails?.pages[page] ? (
            <img
              src={chapterDetails.pages[page].image.file}
              alt="not working"
              className="home-manga-art-pic"
              onClick={onClick}
            />
          ) : (
            <p>Loading...</p> 
          )}
          <h1>
            {page + 1} / {chapterDetails?.pages.length}
          </h1>
          <div className="seekbar-container">
            <div className="seekbar-progress" onMouseDown={handleDragStart}>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default MangaList;



