package edu.nets2120.finalproject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.Reader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.spark.api.java.AbstractJavaRDDLike;
import org.apache.spark.api.java.JavaPairRDD;
import org.apache.spark.api.java.JavaRDD;
import org.apache.spark.api.java.JavaRDDLike;
import org.apache.spark.api.java.JavaSparkContext;
import org.apache.spark.api.java.function.PairFunction;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.RowFactory;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.catalyst.expressions.GenericRowWithSchema;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructType;

import com.amazonaws.services.applicationdiscovery.model.ResourceNotFoundException;
import com.amazonaws.services.dynamodbv2.document.BatchWriteItemOutcome;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.document.TableWriteItems;
import com.amazonaws.services.dynamodbv2.document.UpdateItemOutcome;
import com.amazonaws.services.dynamodbv2.document.api.UpdateItemApi;
import com.amazonaws.services.dynamodbv2.model.AttributeDefinition;
import com.amazonaws.services.dynamodbv2.model.KeySchemaElement;
import com.amazonaws.services.dynamodbv2.model.KeyType;
import com.amazonaws.services.dynamodbv2.model.ProvisionedThroughput;
import com.amazonaws.services.dynamodbv2.model.ResourceInUseException;
import com.amazonaws.services.dynamodbv2.model.ScalarAttributeType;
import com.amazonaws.services.dynamodbv2.model.WriteRequest;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;

import com.fasterxml.jackson.databind.ObjectMapper;

public class LoadNews {
    	/**
	 * The basic logger
	 */
	static Logger logger = LogManager.getLogger(LoadNetwork.class);
    /**
	 * Connection to DynamoDB
	 */
	DynamoDB db;
	Table news;
	
	/**
	 * Connection to Apache Spark
	 */
	SparkSession spark;
	
	JavaSparkContext context;

    /**
	 * Initialize the database connection and open the file
	 * 
	 * @throws IOException
	 * @throws InterruptedException 
	 * @throws DynamoDbException 
	 */
	public void initialize() throws IOException, DynamoDbException, InterruptedException {
		logger.info("Connecting to DynamoDB...");
		db = DynamoConnector.getConnection("https://dynamodb.us-east-1.amazonaws.com");
		
		spark = SparkConnector.getSparkConnection();
		context = SparkConnector.getSparkContext();
		
		logger.debug("Connected!");
	}

	/**
	 * Returns an RDD of parsed talk data
	 * 
	 * @param filePath
	 * @return
	 * @throws IOException
	 */
	JavaRDD<Row> getNews(String filePath) throws IOException {
		Reader reader = null;
		ObjectMapper mapper = new ObjectMapper();

		private class News {
			public String category;
			public String headline;
			public String authors;
			public String link;
			public String short_description;
			public String data;

			public Person(String c, String h, String a, String l, String sd, String d) {
				this.category = c;
				this.headline = h;
				this.authors = a;
				this.link = l;
				this.short_description = sd;
				this.date = d;
			}
		}

		try {
			reader = new BufferedReader(new FileReader(new File(filePath)));

			String nextLine;
			List<News> lines = new ArrayList<>();

			while((nextLine = reader.readNext()) != null) {
				News news = mapper.readValue(nextLine, News.class);
				lines.add(news);
			}

			final StructType schema = new StructType() // Make Schema for the TedTalks
							.add("category", "string")  
							.add("headline", "string") 
							.add("authors", "string")  
							.add("link", "string") 
							.add("short_description", "string") 
							.add("date", "string")

			List<Row> rowOfNews = lines.parallelStream()
							.map(line -> {
								Object[] row = new Object[5]; // assign appropriate values for each Schema
								row[0] = line.category;
								row[1] = line.headline;
								row[2] = line.authors;
								row[3] = line.link;
								row[4] = line.short_description;
								row[5] = line.date;
								return new GenericRowWithSchema(row, schema);// Make Row with Schema
							})
							.collect(Collectors.toList());
			JavaRDD<Row> newsRDD = context.parallelize(rowOfNews);

			return newsRDD;
		} finally {
			if (reader != null)
				reader.close();
		}
    return null;
	}

	/**
	 * Fetch the interest table and create an edge graph
	 * 
	 * @param 
	 * @return JavaPairRDD: (user: string, interest: string)
	 */
	JavaPairRDD<String, String> getInterests(String filePath) {
		// Read into RDD with lines as strings
		JavaRDD<String[]> file = context.textFile(filePath, Config.PARTITIONS)
				.map(line -> line.toString().split(" "));
		
		// Convert to JavaPairRDD from JavaRDD
		JavaPairRDD<String, String> interests = file // create edges
				.mapToPair(x -> new Tuple2<String, String>(x[0], x[1]));
		
		return interests;
	}

	/**
	 * Fetch the friends table and filter only the approved status then, create an edge graph
	 * 
	 * @param 
	 * @return JavaPairRDD: (acceptor: string, asker: string)
	 */
	JavaPairRDD<String, String> getFriends(String filePath) {
		// Read into RDD with lines as strings
		JavaRDD<String[]> file = context.textFile(filePath, Config.PARTITIONS)
				.map(line -> line.toString().split(" "));
		
		// Convert to JavaPairRDD from JavaRDD
		JavaPairRDD<String, String> friends = file // create edges
				.mapToPair(x -> new Tuple2<String, String>(x[0], x[1]));
		
		return friends;
	}

	/**
	 * Fetch the friends table and filter only the approved status then, create an edge graph
	 * 
	 * @param 
	 * @return JavaPairRDD: (acceptor: string, asker: string)
	 */
	JavaPairRDD<String, String> getLikes(String filePath) {
		// Read into RDD with lines as strings
		JavaRDD<String[]> file = context.textFile(filePath, Config.PARTITIONS)
				.map(line -> line.toString().split(" "));
		
		// Convert to JavaPairRDD from JavaRDD
		JavaPairRDD<String, String> likes = file // create edges
				.mapToPair(x -> new Tuple2<String, String>(x[0], x[1]));
		
		return likes;
	}

	/**
	 * Main functionality in the program: read and process the social network
	 * 
	 * @throws IOException File read, network, and other errors
	 * @throws DynamoDbException DynamoDB is unhappy with something
	 * @throws InterruptedException User presses Ctrl-C
	 */
	public void run() throws IOException, DynamoDbException, InterruptedException {
		logger.info("Running");

		// Load + store the news data
		JavaRDD<Row> newsData = this.getNews("NewsCategoryData.txt");
		
		// upload to Dynamo_DB
		newsData.foreachPartition(iter -> { 
			HashSet<Item> rows = new HashSet<Item>(); 
			DynamoDB conn = DynamoConnector.getConnection("https://dynamodb.us-east-1.amazonaws.com");
			String tableName = "news";
			while (iter.hasNext()) {
				Row news = iter.next();
				// Create Item
				Item newsItem = new Item()
						.withPrimaryKey("category", news.getAs(0))
						.withString("headline", (String) news.getAs(1))
						.withString("authors", (String) talk.getAs(2))
						.withString("link", (String) talk.getAs(3))
						.withString("short_description", (String) talk.getAs(4));
				rows.add(newsItem);
				
				if (rows.size() == 25 || !iter.hasNext()) {
					TableWriteItems writ = new TableWriteItems(tableName).withItemsToPut(rows);
					BatchWriteItemOutcome ret = conn.batchWriteItem(writ);
					Map<String, List<WriteRequest>> leftover = ret.getUnprocessedItems();
					if (leftover != null && leftover.size() != 0) {
						conn.batchWriteItemUnprocessed(leftover);	
					}
					rows = new HashSet<Item>();
				}	
			}
		});


		JavaPairRDD <String, String> newsPair = newsData
				.mapToPair(x -> new Tuple2<String, String>(x.getAs(0), x.getAs(1)));
		
		// JavaPairRDD <String, String> interests = getInterests("");



		
		
		
	}
	

	public void shutdown() {
		logger.info("Shutting down");
		
		DynamoConnector.shutdown();
		
		if (spark != null)
			spark.close();
	}
	
	public static void main(String[] args) {
		final LoadNews ln = new LoadNews();

		try {
			ln.initialize();

			ln.run();
		} catch (final IOException ie) {
			logger.error("I/O error: ");
			ie.printStackTrace();
		} catch (final DynamoDbException e) {
			e.printStackTrace();
		} catch (final InterruptedException e) {
			e.printStackTrace();
		} finally {
			ln.shutdown();
		}
	}   
}

