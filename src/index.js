import React from 'react';
import PropTypes from 'prop-types';
import ViewPropTypes from 'react-native';
import { Expo, Svg } from 'expo';
import _ from 'lodash';
import { DAYS_IN_WEEK, MILLISECONDS_IN_ONE_DAY, MONTH_LABELS } from './constants';
import { shiftDate, getBeginningTimeForDate, convertToDate } from './dateHelpers';

const SQUARE_SIZE = 20;
const MONTH_LABEL_GUTTER_SIZE = 8;
const rectColor = ['rgba(255, 255, 255, 0.1)','rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.6)']

export class CalendarHeatmap extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      valueCache: this.getValueCache(props.values),
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      valueCache: this.getValueCache(nextProps.values),
    });
  }

  getSquareSizeWithGutter() {
    return SQUARE_SIZE + this.props.gutterSize;
  }

  getMonthLabelSize() {
    if (!this.props.showMonthLabels) {
      return 0;
    } else if (this.props.horizontal) {
      return SQUARE_SIZE + MONTH_LABEL_GUTTER_SIZE;
    }
    return 2 * (SQUARE_SIZE + MONTH_LABEL_GUTTER_SIZE);
  }

  getStartDate() {
    return shiftDate(this.getEndDate(), -this.props.numDays + 1); // +1 because endDate is inclusive
  }

  getEndDate() {
    return getBeginningTimeForDate(convertToDate(this.props.endDate));
  }

  getStartDateWithEmptyDays() {
    return shiftDate(this.getStartDate(), -this.getNumEmptyDaysAtStart());
  }

  getNumEmptyDaysAtStart() {
    return this.getStartDate().getDay();
  }

  getNumEmptyDaysAtEnd() {
    return (DAYS_IN_WEEK - 1) - this.getEndDate().getDay();
  }

  getWeekCount() {
    const numDaysRoundedToWeek = this.props.numDays + this.getNumEmptyDaysAtStart() + this.getNumEmptyDaysAtEnd();
    return Math.ceil(numDaysRoundedToWeek / DAYS_IN_WEEK);
  }

  getWeekWidth() {
    return DAYS_IN_WEEK * this.getSquareSizeWithGutter();
  }

  getWidth() {
    return (this.getWeekCount() * this.getSquareSizeWithGutter()) - this.props.gutterSize;
  }

  getHeight() {
    return this.getWeekWidth() + (this.getMonthLabelSize() - this.props.gutterSize);
  }

  getValueCache(values) {
    return _.reduce(values, (memo, value) => {
      const date = convertToDate(value.date);
      const index = Math.floor((date - this.getStartDateWithEmptyDays()) / MILLISECONDS_IN_ONE_DAY);
      memo[index] = {
        value,
        title: this.props.titleForValue ? this.props.titleForValue(value) : null,
        tooltipDataAttrs: this.getTooltipDataAttrsForValue(value),
      };
      return memo;
    }, {});
  }

  getValueForIndex(index) {
    if (this.state.valueCache[index]) {
      return this.state.valueCache[index].value;
    }
    return null;
  }

  getClassNameForIndex(index) {
    if (this.state.valueCache[index]) {
      return rectColor[this.state.valueCache[index].value.count];
    }
    return rectColor[0];
  }

  getTitleForIndex(index) {
    if (this.state.valueCache[index]) {
      return this.state.valueCache[index].title;
    }
    return this.props.titleForValue ? this.props.titleForValue(null) : null;
  }

  getTooltipDataAttrsForIndex(index) {
    if (this.state.valueCache[index]) {
      return this.state.valueCache[index].tooltipDataAttrs;
    }
    return this.getTooltipDataAttrsForValue({ date: null, count: null });
  }

  getTooltipDataAttrsForValue(value) {
    const { tooltipDataAttrs } = this.props;

    if (typeof tooltipDataAttrs === 'function') {
      return tooltipDataAttrs(value);
    }
    return tooltipDataAttrs;
  }

  getTransformForWeek(weekIndex) {
    if (this.props.horizontal) {
      return [weekIndex * this.getSquareSizeWithGutter(), 50];
    }
    return [10, weekIndex * this.getSquareSizeWithGutter()];
  }

  getTransformForMonthLabels() {
    if (this.props.horizontal) {
      return null;
    }
    return `${this.getWeekWidth() + MONTH_LABEL_GUTTER_SIZE}, 0`;
  }

  getTransformForAllWeeks() {
    if (this.props.horizontal) {
      return `0, ${this.getMonthLabelSize() - 100}`;
    }
    return null;
  }

  getViewBox() {
    if (this.props.horizontal) {
      return `${this.getWidth()} ${this.getHeight()}`;
    }
    return `${this.getHeight()} ${this.getWidth()}`;
  }

  getSquareCoordinates(dayIndex) {
    if (this.props.horizontal) {
      return [0, dayIndex * this.getSquareSizeWithGutter()];
    }
    return [dayIndex * this.getSquareSizeWithGutter(), 0];
  }

  getMonthLabelCoordinates(weekIndex) {
    if (this.props.horizontal) {
      return [
        weekIndex * this.getSquareSizeWithGutter(),
        this.getMonthLabelSize() - MONTH_LABEL_GUTTER_SIZE,
      ];
    }
    const verticalOffset = -2;
    return [
      0,
      ((weekIndex + 1) * this.getSquareSizeWithGutter()) + verticalOffset,
    ];
  }

  handleClick(value) {
    if (this.props.onClick) {
      this.props.onClick(value);
    }
  }

  renderSquare(dayIndex, index) {
    const indexOutOfRange = index < this.getNumEmptyDaysAtStart() || index >= this.getNumEmptyDaysAtStart() + this.props.numDays;
    if (indexOutOfRange && !this.props.showOutOfRangeDays) {
      return null;
    }
    const [x, y] = this.getSquareCoordinates(dayIndex);
    return (
      <Svg.Rect
        key={index}
        width={SQUARE_SIZE}
        height={SQUARE_SIZE}
        x={x}
        y={y}
        title={this.getTitleForIndex(index)}
        onPress={() => alert(this.getTitleForIndex(index))}
        fill={this.getClassNameForIndex(index)}
        // onPress={this.handleClick.bind(this, this.getValueForIndex(index))}
        {...this.getTooltipDataAttrsForIndex(index)}
      />
    );
  }

  renderWeek(weekIndex) {
    const [x, y] = this.getTransformForWeek(weekIndex);
    return (
      <Svg.G key={weekIndex} x={x} y={y}>
        {_.range(DAYS_IN_WEEK).map(dayIndex => this.renderSquare(dayIndex, (weekIndex * DAYS_IN_WEEK) + dayIndex))}
      </Svg.G>
    );
  }

  renderAllWeeks() {
    return _.range(this.getWeekCount()).map(weekIndex => this.renderWeek(weekIndex));
  }

  renderMonthLabels() {
    if (!this.props.showMonthLabels) {
      return null;
    }
    const weekRange = _.range(this.getWeekCount() - 1);  // don't render for last week, because label will be cut off
    return weekRange.map((weekIndex) => {
      const endOfWeek = shiftDate(this.getStartDateWithEmptyDays(), (weekIndex + 1) * DAYS_IN_WEEK);
      const [x, y] = this.getMonthLabelCoordinates(weekIndex);
      return (endOfWeek.getDate() >= 1 && endOfWeek.getDate() <= DAYS_IN_WEEK) ? (
        <Svg.Text
          key={weekIndex}
          x={x}
          y={y}
        >
          {MONTH_LABELS[endOfWeek.getMonth()]}
        </Svg.Text>
      ) : null;
    });
  }

  render() {
    return (
        <Svg
          height={this.getHeight()}
          width={this.getWidth()}
        >
          <Svg.G>
            {this.renderMonthLabels()}
          </Svg.G>
          <Svg.G >
            {this.renderAllWeeks()}
          </Svg.G>
        </Svg>
    );
  }
}

CalendarHeatmap.ViewPropTypes = {
  values: PropTypes.arrayOf(             // array of objects with date and arbitrary metadata
    PropTypes.shape({
      date: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]).isRequired,
    }).isRequired
  ).isRequired,
  numDays: PropTypes.number,             // number of days back from endDate to show
  endDate: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),  // end of date range
  gutterSize: PropTypes.number,          // size of space between squares
  horizontal: PropTypes.bool,            // whether to orient horizontally or vertically
  showMonthLabels: PropTypes.bool,       // whether to show month labels
  showOutOfRangeDays: PropTypes.bool,    // whether to render squares for extra days in week after endDate, and before start date
  tooltipDataAttrs: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),    // data attributes to add to square for setting 3rd party tooltips, e.g. { 'data-toggle': 'tooltip' } for bootstrap tooltips
  titleForValue: PropTypes.func,         // function which returns title text for value
  classForValue: PropTypes.func,         // function which returns html class for value
  onClick: PropTypes.func,               // callback function when a square is clicked
};

CalendarHeatmap.defaultProps = {
  numDays: 200,
  endDate: new Date(),
  gutterSize: 1,
  horizontal: true,
  showMonthLabels: true,
  showOutOfRangeDays: false,
  classForValue: value => (value ? 'black' : '#8cc665'),
};
