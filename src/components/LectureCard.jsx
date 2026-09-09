import { Clock, MapPin } from 'lucide-react';

export default function LectureCard({
  title,
  time,
  location,
  onClick
}) {
  return (
    <div
      className="schedule-item"
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="schedule-time">
        {time}
      </div>

      <div>
        <h4>{title}</h4>

        <p>
          <MapPin size={13} />
          {location}
        </p>
      </div>
    </div>
  );
}