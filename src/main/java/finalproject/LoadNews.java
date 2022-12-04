package finalproject;

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

import com.google.gson.*;
import storage.DynamoConnector;
import storage.SparkConnector;
import scala.Tuple2;
import storage.News;

public class LoadNews {
    	/**
	 * The basic logger
	 */
	static Logger logger = LogManager.getLogger(LoadNews.class);
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
		BufferedReader reader = null;
		JsonParser mapper = new JsonParser();

		//try {
			reader = new BufferedReader(new FileReader(new File(filePath)));

			String nextLine;
			List<JsonObject> lines = new ArrayList<>();
			//List<News> lines = new ArrayList<>();
			//List<News> lines = mapper.readValue(filePath, News.class);

			while((nextLine = reader.readLine()) != null) {
				
				//JsonElement n = ;
				JsonObject news = mapper.parseString(nextLine).getAsJsonObject();
				//News news = mapper.convertValue(n, News.class);
				lines.add(news);
			}

			final StructType schema = new StructType() // Make Schema for the TedTalks
							.add("category", "string")  
							.add("headline", "string") 
							.add("authors", "string")  
							.add("link", "string") 
							.add("short_description", "string") 
							.add("date", "string");

			List<Row> rowOfNews = lines.parallelStream()
							.map(line -> {
								Object[] row = new Object[6]; // assign appropriate values for each Schema
								row[0] = line.get("category").toString();
								row[1] = line.get("headline").toString();
								row[2] = line.get("authors").toString();
								row[3] = line.get("link").toString();
								row[4] = line.get("short_description").toString();
								row[5] = line.get("date").toString();
								//System.out.println(row);
								return new GenericRowWithSchema(row, schema);// Make Row with Schema
							})
							.collect(Collectors.toList());
			JavaRDD<Row> newsRDD = context.parallelize(rowOfNews);

			return newsRDD;
		/*} finally {
			if (reader != null)
				reader.close();
		}
    	return null;*/
	}

	/**
	 * Fetch the interest table and create an edge graph
	 * 
	 * @param 
	 * @return JavaPairRDD: (user: string, interest: string)
	 */
	JavaPairRDD<String, String> getInterests(String filePath) {
		// Read into RDD with lines as strings
		JavaRDD<String[]> file = context.textFile(filePath)
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
		JavaRDD<String[]> file = context.textFile(filePath)
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
		JavaRDD<String[]> file = context.textFile(filePath)
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
		//initialize();
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
						.withPrimaryKey("headline", (String) news.getAs(1), "date", (String) news.getAs(5))
						.withString("category", (String) news.getAs(0))
						.withString("authors", (String) news.getAs(2))
						.withString("link", (String) news.getAs(3))
						.withString("short_description", (String) news.getAs(4));
						//.withString("date", (String) news.getAs(5));
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
		
	}

	/*public void computeRanks() {
		JavaRDD<Row> newsData = this.getNews("NewsCategoryData.txt");

		JavaPairRDD <String, String> CtoA = newsData
				.mapToPair(x -> new Tuple2<String, String>((String) x.getAs(0), (String) x.getAs(1)));

		JavaPairRDD <String, String> newsPair = CtoA
				.union(CtoA.mapToPair(x -> new Tuple2<String, String>(x._2, x._1)))
				.distinct();

		JavaPairRDD<String, Double> categoryNodeWeight = CtoA
				.mapToPair(x -> new Tuple2<String, Integer>(x._1, 1)) // c->a adjacent node weight should sum up to 1
				.reduceByKey((x, y) -> x + y) // find the degree of the node
				.mapToPair(x -> new Tuple2<String, Double>(x._1, (1.0 /x._2)));

		JavaPairRDD<String, Tuple2<String, Double>> catArtEdgeTransfer = CtoA
				.join(categoryNodeWeight);

		// JavaPairRDD <String, String> interests = getInterests("");
	}*/
	

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

