import React, { useState, useEffect, useMemo } from 'react';

interface ButtonProps {
	label: string;
	onClick: () => void;
	disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, disabled = false }) => {
	const [clicked, setClicked] = useState(false);

	useEffect(() => {
		if (clicked) {
			const timer = setTimeout(() => setClicked(false), 1000);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [clicked]);

	const className = useMemo(() => {
		return disabled ? 'btn-disabled' : 'btn-active';
	}, [disabled]);

	const handleClick = (): void => {
		setClicked(true);
		onClick();
	};

	return (
		<button className={className} onClick={handleClick} disabled={disabled}>
			{label}
		</button>
	);
};

export default Button;
