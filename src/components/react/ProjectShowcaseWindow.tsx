type Props = {
  name: string;
  domain: string;
  imageSrc: string;
  imageSrcSet?: string;
  imageWidth: number;
  imageHeight: number;
  alt: string;
  sizes?: string;
};

export default function ProjectShowcaseWindow({
  name,
  domain,
  imageSrc,
  imageSrcSet,
  imageWidth,
  imageHeight,
  alt,
  sizes = '(min-width: 1280px) 58vw, (min-width: 1024px) 56vw, 100vw',
}: Props) {
  return (
    <figure className="project-showcase-window">
      <div className="project-showcase-window__chrome" aria-hidden="true">
        <span className="project-showcase-window__dots">
          <span />
          <span />
          <span />
        </span>
        <span className="project-showcase-window__meta">
          <span className="project-showcase-window__name">{name}</span>
          <span className="project-showcase-window__sep" aria-hidden="true">
            ·
          </span>
          <span className="project-showcase-window__domain">{domain}</span>
        </span>
      </div>
      <div className="project-showcase-window__viewport">
        <img
          src={imageSrc}
          srcSet={imageSrcSet}
          alt={alt}
          width={imageWidth}
          height={imageHeight}
          loading="lazy"
          decoding="async"
          sizes={sizes}
          className="project-showcase-window__image"
        />
      </div>
    </figure>
  );
}
