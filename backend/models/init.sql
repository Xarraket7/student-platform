-- Database initialization script
-- Run: psql -U postgres -d student_platform -f init.sql

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    avatar VARCHAR(500) DEFAULT 'default.png',
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student', 'guest')),
    age INTEGER,
    birthday DATE,
    group_name VARCHAR(100),
    google_id VARCHAR(255),
    is_online BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS communities (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    background VARCHAR(500),
    icon VARCHAR(500),
    feed_icon VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    image VARCHAR(500),
    is_feed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
    text TEXT,
    image VARCHAR(500),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50),
    text TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(500),
    event_date DATE,
    event_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    image VARCHAR(500),
    background VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gallery (
    id SERIAL PRIMARY KEY,
    community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
    image VARCHAR(500) NOT NULL,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user
INSERT INTO users (name, email, password, avatar, role) VALUES
('Администратор', 'admin@college.kz', '$2a$10$XQxBj1N8C8VqWmqK8VrGxeH7C3F.VF5fG8W1eXBQ.XL7jVKPmKBXi', 'Admin.png', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert demo users
INSERT INTO users (name, email, avatar, role, group_name) VALUES
('Said Amankeldin', 'said@college.kz', 'Said Amankeldin.png', 'student', 'SE-2201'),
('Almaz Botkoldin', 'almaz@college.kz', 'Botkoldin Almaz.png', 'student', 'SE-2201'),
('Tair Nariman', 'tair@college.kz', 'Tair Nariman.png', 'student', 'SE-2202'),
('Alina', 'alina@college.kz', 'Alina.png', 'student', 'SE-2203'),
('Malik Taskenbaev', 'malik@college.kz', 'Malik Taskenbaev.png', 'student', 'SE-2201'),
('Eldar Muhtarof', 'eldar@college.kz', 'Eldar Muhtarof.png', 'teacher', 'SE-2201'),
('Talgat Janjazin', 'talgat@college.kz', 'Talgat Janjazin.png', 'student', 'SE-2204'),
('Арман', 'arman@college.kz', 'Арман.png', 'student', 'SE-2201')
ON CONFLICT (email) DO NOTHING;

-- Insert communities (без Эко клуб)
INSERT INTO communities (title, slug, description, background, icon, feed_icon) VALUES
('Дебаты', 'debates', 'Клуб дебатов колледжа', 'microsoft-mahjong-5120x2880-22143 1.png', 'Дебаты.png', 'Дебаты.png'),
('Клуб путешествий', 'travel', 'Клуб путешествий и приключений', 'microsoft-mahjong-5120x2880-22143 2.png', 'Клуб путешествий.png', 'Клуб путешествий.png'),
('Лабораторная / Практика', 'laboratory', 'Научная лаборатория и практика', 'microsoft-mahjong-5120x2880-22143 3.png', 'Лабораторная.png', 'Лабораторная.png'),
('Мобилографы', 'mobilography', 'Клуб мобильной фотографии', 'microsoft-mahjong-5120x2880-22143 6.png', 'Мобилографы.png', 'Мобилографы.png'),
('Спортивный клуб', 'sports', 'Спортивный клуб колледжа', 'microsoft-mahjong-5120x2880-22143 7.png', 'Спортивный клуб.png', 'Спортивный клуб.png'),
('Волонтеры', 'volunteers', 'Волонтерский клуб', 'microsoft-mahjong-5120x2880-22143 8.png', 'Волонтеры.png', 'Волонтеры.png')
ON CONFLICT (slug) DO NOTHING;

-- Insert events
INSERT INTO events (title, description, icon, event_date, event_time) VALUES
('Киноночь: просмотр фильма', 'В колледже пройдет вечерний просмотр фильма в уютной атмосфере. Это отличная возможность отдохнуть после занятий, пообщаться с друзьями и провести время вместе.', 'film-camera-svgrepo-com 1.png', '2026-04-15', '19:00'),
('Лекция: как создать стартап', 'Эксперты расскажут о создании собственного проекта, поиске инвестиций и первых шагах в предпринимательстве. Подойдет студентам всех направлений.', 'browser-svgrepo-com 1.png', '2026-04-18', '14:00'),
('Тур поход в горы', 'Организованный выезд в горы для активного отдыха и командного взаимодействия. Прекрасная возможность зарядиться энергией и укрепить дружеские связи.', 'map-svgrepo-com 1.png', '2026-04-15', '08:00'),
('Обновление расписания', 'Обновлено расписание занятий и экзаменов. Рекомендуется проверить изменения в разделе учебной информации и ознакомиться с актуальными материалами.', 'book-opened-svgrepo-com 1.png', NULL, NULL),
('Сообщение от кураторов', 'Важная информация по организационным вопросам и предстоящим мероприятиям. Подробности доступны в разделе образовательных материалов платформы.', 'speaker-svgrepo-com 1.png', NULL, NULL),
('Визит гостей в колледж', 'В колледже состоится встреча с приглашенными специалистами. Студенты смогут задать вопросы и получить полезные профессиональные рекомендации.', 'shorts-svgrepo-com 1.png', NULL, NULL);

-- Insert announcements
INSERT INTO announcements (title, description, image, background) VALUES
('СТАЖИРОВКА В КИТАЙ', 'Колледж объявляет набор студентов на учебно-практическую стажировку в Китай, город Гуанчжоу. Поездка запланирована на 15–30 июня 2026 года.

В рамках стажировки студенты примут участие в образовательной программе, познакомятся с системой обучения, получат практический опыт и смогут ближе узнать культуру и традиции Китая.

В программу также входят экскурсии, культурные мероприятия и работа в международной среде, что поможет развить профессиональные и коммуникативные навыки.

Количество мест ограничено.
Подробные образовательные материалы и условия участия доступны в разделе учебных программ платформы.', 'great-wall-of-china-sunset-orange-sky-mountains-beijing-6048x4032-2134 1.png', 'great-wall-of-china-sunset-orange-sky-mountains-beijing-6048x4032-2134 1.png'),

('МАСТЕР КЛАСС', 'Колледж приглашает студентов на онлайн и офлайн мастер-класс по современному дизайну и графическим технологиям, который пройдет 12 марта 2026 года.

Во время мастер-класса участники смогут познакомиться с новыми инструментами, получить практические советы от профессионалов и поработать над небольшими проектами в режиме реального времени.

Мастер-класс подходит для студентов всех направлений, кто хочет развивать творческие и технические навыки в дизайне.

Дополнительные образовательные материалы и регистрация доступны в разделе мероприятий платформы.', 'back-to-school-color-papers-stationery-multicolor-colorful-6017x4003-2044 1.png', 'back-to-school-color-papers-stationery-multicolor-colorful-6017x4003-2044 1.png'),

('РАСПИСАНИЕ ЭКЗАМЕНОВ', 'Внимание, студенты! В связи с организационными изменениями, расписание экзаменов на май 2026 года было скорректировано.

Рекомендуется внимательно проверить свои индивидуальные расписания, чтобы избежать пропуска экзаменов.

Все изменения действуют с момента публикации, и за дополнительной информацией можно обратиться к куратору или администратору.

Обновленные образовательные материалы и графики доступны в разделе учебной информации платформы.', 'the-weeknd-canadian-5600x4610-9582 1.png', 'the-weeknd-canadian-5600x4610-9582 1.png');

-- Insert sample feed posts
INSERT INTO posts (community_id, author_id, content, image, is_feed, created_at) VALUES
(5, 1, 'Добро пожаловать в Спортивный клуб! Тренировки каждый вторник и четверг.', 'Rectangle 1.png', true, NOW() - INTERVAL '2 days'),
(1, 1, 'Новый сезон дебатов начинается на следующей неделе. Регистрация открыта!', 'Rectangle 2.png', true, NOW() - INTERVAL '1 day'),
(6, 1, 'Волонтерская акция в субботу. Присоединяйтесь!', 'Rectangle 3.png', true, NOW() - INTERVAL '5 hours');
